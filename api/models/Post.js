import { flatten } from 'lodash'

module.exports = bookshelf.Model.extend({
  tableName: 'post',

  user: function () {
    return this.belongsTo(User)
  },

  communities: function () {
    return this.belongsToMany(Community).through(PostMembership)
    .query({where: {'community.active': true}})
  },

  followers: function () {
    return this.belongsToMany(User).through(Follow).withPivot('added_by_id')
  },

  contributions: function () {
    return this.hasMany(Contribution, 'post_id')
  },

  comments: function () {
    return this.hasMany(Comment, 'post_id').query({where: {active: true}})
  },

  media: function () {
    return this.hasMany(Media)
  },

  votes: function () {
    return this.hasMany(Vote)
  },

  projects: function () {
    return this.belongsToMany(Project, 'posts_projects')
  },

  responders: function () {
    return this.belongsToMany(User).through(EventResponse)
  },

  userVote: function (userId) {
    return this.votes().query({where: {user_id: userId}}).fetchOne()
  },

  relatedUsers: function () {
    return this.belongsToMany(User, 'posts_about_users')
  },

  tags: function () {
    return this.belongsToMany(Tag).through(PostTag).withPivot('selected')
  },

  // should only be one of these per post
  selectedTags: function () {
    return this.belongsToMany(Tag).through(PostTag).withPivot('selected')
    .query({where: {selected: true}})
  },

  children: function () {
    return this.hasMany(Post, 'parent_post_id')
    .query({where: {active: true}})
  },

  parent: function () {
    return this.belongsTo(Post, 'parent_post_id')
  },

  addFollowers: function (userIds, addingUserId, opts) {
    var postId = this.id
    var userId = this.get('user_id')
    if (!opts) opts = {}

    return this.load('communities')
    .then(() => {
      return Promise.map(userIds, followerId =>
        Follow.create(followerId, postId, {
          addedById: addingUserId,
          transacting: opts.transacting
        })
        .tap(follow => {
          if (!opts.createActivity) return

          var updates = []
          const addActivity = (recipientId, method) => {
            updates.push(Activity[method](follow, recipientId)
            .save({}, _.pick(opts, 'transacting'))
            .then(activity => activity.createNotifications(opts.transacting)))
          }
          if (followerId !== addingUserId) addActivity(followerId, 'forFollowAdd')
          if (userId !== addingUserId) addActivity(userId, 'forFollow')
          return Promise.all(updates)
        }))
    })
  },

  removeFollower: function (userId, opts) {
    var self = this
    return Follow.where({user_id: userId, post_id: this.id}).destroy()
      .tap(function () {
        if (!opts.createActivity) return
        return Activity.forUnfollow(self, userId)
        .save()
        .then(activity => activity.createNotifications())
      })
  },

  isPublic: function () {
    return this.get('visibility') === Post.Visibility.PUBLIC_READABLE
  },

  updateCommentCount: function (trx) {
    var self = this
    return Aggregate.count(this.comments(), {transacting: trx})
    .tap(count => self.save({
      num_comments: count,
      updated_at: new Date()
    }, {patch: true, transacting: trx}))
  },

  isWelcome: function () {
    return this.get('type') === Post.Type.WELCOME
  },

  copy: function (attrs) {
    var that = this.clone()
    _.merge(that.attributes, Post.newPostAttrs(), attrs)
    delete that.id
    delete that.attributes.id
    that._previousAttributes = {}
    that.changed = {}
    return that
  },

  createActivities: function (trx) {
    var self = this
    return self.load(['communities', 'communities.users', 'tags'], {transacting: trx})
    .then(() =>
      TagFollow.query(qb => {
        qb.whereIn('tag_id', self.relations.tags.map('id'))
        qb.whereIn('community_id', self.relations.communities.map('id'))
      })
      .fetchAll({withRelated: ['tag'], transacting: trx}))
    .then(tagFollows => {
      const mentioned = RichText.getUserMentions(self.get('description')).map(userId => ({
        reader_id: userId,
        post_id: self.id,
        actor_id: self.get('user_id'),
        reason: 'mention'
      }))
      const members = flatten(self.relations.communities.map(community =>
        community.relations.users.map(user => ({
          reader_id: user.id,
          post_id: self.id,
          actor_id: self.get('user_id'),
          community_id: community.id,
          reason: `newPost: ${community.id}`
        }))))
      const tagFollowers = tagFollows.map(tagFollow => ({
        reader_id: tagFollow.get('user_id'),
        post_id: self.id,
        actor_id: self.get('user_id'),
        community_id: tagFollow.get('community_id'),
        reason: `tag: ${tagFollow.relations.tag.get('name')}`
      }))
      return Activity.saveForReasons(mentioned.concat(members).concat(tagFollowers), trx)
    })
  }

}, {
  Type: {
    REQUEST: 'request',
    OFFER: 'offer',
    INTENTION: 'intention',
    WELCOME: 'welcome',
    EVENT: 'event',
    CHAT: 'chat'
  },

  Visibility: {
    DEFAULT: 0,
    PUBLIC_READABLE: 1,
    DRAFT_PROJECT: 2
  },

  countForUser: function (user, type) {
    const attrs = {user_id: user.id, active: true}
    if (type) attrs.type = type
    return this.query().count().where(attrs).then(rows => rows[0].count)
  },

  groupedCountForUser: function (user) {
    return this.query(q => {
      q.join('posts_tags', 'post.id', 'posts_tags.post_id')
      q.join('tags', 'tags.id', 'posts_tags.tag_id')
      q.whereIn('tags.name', ['request', 'offer'])
      q.groupBy('tags.name')
      q.where({user_id: user.id, active: true})
      q.select('tags.name')
    }).query().count()
    .then(rows => rows.reduce((m, n) => {
      m[n.name] = n.count
      return m
    }, {}))
  },

  isVisibleToUser: function (postId, userId) {
    var pcids

    return Post.find(postId)
    // is the post public?
    .then(post => post.isPublic())
    .then(success =>
      // or is the user:
      success || Promise.join(
        PostMembership.query().where({post_id: postId}),
        Membership.query().where({user_id: userId, active: true})
      )
      .spread((postMships, userMships) => {
        // in one of the post's communities?
        pcids = postMships.map(m => m.community_id)
        return _.intersection(pcids, userMships.map(m => m.community_id)).length > 0
      }))
    .then(success =>
      // or following the post?
      success || Follow.exists(userId, postId))
    .then(success =>
      // or in the post's project?
      success || PostProjectMembership.where({post_id: postId}).fetch()
      .then(ppm => ppm && Project.isVisibleToUser(ppm.get('project_id'), userId)))
    .then(success =>
      // or in one of the post's communities' networks?
      success || Community.query().whereIn('id', pcids).pluck('network_id')
      .then(networkIds =>
        Promise.map(_.compact(_.uniq(networkIds)), id =>
          Network.containsUser(id, userId)))
      .then(results => _.some(results)))
  },

  find: function (id, options) {
    return Post.where({id: id, active: true}).fetch(options).catch(() => null)
  },

  createdInTimeRange: function (collection, startTime, endTime) {
    if (endTime === undefined) {
      endTime = startTime
      startTime = collection
      collection = Post
    }
    return collection.query(function (qb) {
      qb.whereRaw('post.created_at between ? and ?', [startTime, endTime])
      qb.where('post.active', true)
      qb.where('visibility', '!=', Post.Visibility.DRAFT_PROJECT)
    })
  },

  createWelcomePost: function (userId, communityId, trx) {
    var attrs = _.merge(Post.newPostAttrs(), {
      type: 'welcome'
    })

    return new Post(attrs).save({}, {transacting: trx})
    .tap(post => Promise.join(
      post.relatedUsers().attach(userId, {transacting: trx}),
      post.communities().attach(communityId, {transacting: trx}),
      Follow.create(userId, post.id, {transacting: trx})
    ))
  },

  newPostAttrs: () => ({
    created_at: new Date(),
    updated_at: new Date(),
    active: true,
    num_comments: 0,
    num_votes: 0
  }),

  create: function (attrs, opts) {
    return Post.forge(_.merge(Post.newPostAttrs(), attrs))
    .save(null, _.pick(opts, 'transacting'))
  },

  setRecentComments: opts => {
    const comments = () => bookshelf.knex('comment')
    return comments()
    .where({post_id: opts.postId, active: true})
    .orderBy('created_at', 'desc')
    .pluck('id')
    .then(ids => Promise.all([
      comments().where('id', 'in', ids.slice(0, 3)).update('recent', true),
      ids.length > 3 && comments().where('id', 'in', ids.slice(3)).update('recent', false)
    ]))
  },

  setTagIfNeeded: postId => {
    return Post.find(postId, {withRelated: 'selectedTags'})
    .then(post => {
      const type = post.get('type')
      if (post.relations.selectedTags.first() || type === 'event') return

      return bookshelf.transaction(trx => Tag.updateForPost(post, type, trx))
    })
  }
})
