import '../../../test/setup'
import factories from '../../../test/setup/factories'
import { pinPost } from './post'

describe('pinPost', () => {
  var user, group, post

  before(function () {
    user = factories.user()
    group = factories.group()
    post = factories.post()
    return Promise.join(group.save(), user.save(), post.save())
    .then(() => group.posts().attach(post))
    .then(() => user.joinGroup(group, GroupMembership.Role.MODERATOR))
  })

  it('sets pinned_at to current time if not set', () => {
    return pinPost(user.id, post.id, group.id)
    .then(() => PostMembership.find(post.id, group.id))
    .then(postMembership => {
      expect(postMembership.get('pinned_at').getTime())
      .to.be.closeTo(new Date().getTime(), 2000)
    })
  })

  it('sets pinned_at to null if set', () => {
    return pinPost(user.id, post.id, group.id)
    .then(() => PostMembership.find(post.id, group.id))
    .then(postMembership => {
      expect(postMembership.get('pinned_at')).to.equal(null)
    })
  })

  it('rejects if user is not a moderator', () => {
    return pinPost('777', post.id, group.id)
    .then(() => expect.fail('should reject'))
    .catch(e => expect(e.message).to.match(/don't have permission/))
  })

  it("rejects if postMembership doesn't exist", () => {
    return pinPost(user.id, '919191', group.id)
    .then(() => expect.fail('should reject'))
    .catch(e => expect(e.message).to.match(/Couldn't find postMembership/))
  })
})
