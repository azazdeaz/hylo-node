/* eslint key-spacing:0 */

/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your controllers.
 * You can apply one or more policies to a given controller, or protect
 * its actions individually.
 *
 * Any policy file (e.g. `api/policies/authenticated.js`) can be accessed
 * below by its filename, minus the extension, (e.g. "authenticated")
 *
 * For more information on how policies work, see:
 * http://sailsjs.org/#/documentation/concepts/Policies
 *
 * For more information on configuring policies, check out:
 * http://sailsjs.org/#/documentation/reference/sails.config/sails.config.policies.html
 */

module.exports.policies = {

  '*': false,

  SessionController: true,

  InvitationController: {
    use: true,
    findOne: true,
    find: ['sessionAuth', 'canInvite'],
    create: ['sessionAuth', 'canInvite']
  },

  AdminSessionController: {
    create:  true,
    oauth:   true,
    destroy: true
  },

  AdminController: {
    '*': ['isAdmin']
  },

  SearchController: {
    show: ['allowPublicAccess', 'sessionAuth', 'checkAndSetMembership'],
    autocomplete: ['sessionAuth', 'checkAndSetMembership'],
    showFullText: ['sessionAuth']
  },

  UserController: {
    status:              true,
    create:              true,
    findSelf:            ['allowPublicAccess', 'sessionAuth'],
    findOne:             ['sessionAuth', 'inSameCommunityOrNetwork'],
    update:              ['sessionAuth', 'isSelf'],
    contributions:       ['sessionAuth', 'inSameCommunityOrNetwork'],
    thanks:              ['sessionAuth', 'inSameCommunityOrNetwork'],
    sendPasswordReset:   true,
    findForCommunity:    ['allowTokenAuth', 'sessionAuth', 'checkAndSetMembership'],
    findForNetwork:      ['sessionAuth', 'inNetwork'],
    findForPostVote:     ['allowPublicAccess', 'sessionAuth', 'checkAndSetPost']
  },

  ActivityController: {
    find:             ['sessionAuth'],
    findForCommunity: ['sessionAuth', 'checkAndSetMembership'],
    update:           ['sessionAuth', 'isActivityOwner'],
    markAllRead:      ['sessionAuth']
  },

  OnboardingController: {
    find:   ['sessionAuth'],
    update: ['sessionAuth', 'isSelf']
  },

  CommunityController: {
    find:            ['sessionAuth', 'isAdmin'],
    findOne:         ['allowPublicAccess', 'allowTokenAuth', 'sessionAuth', 'checkAndSetMembership'],
    findSettings:    ['sessionAuth', 'canInvite'],
    update:          ['sessionAuth', 'isModerator'],
    addSlack:        ['sessionAuth', 'isModerator'],
    findModerators:  ['sessionAuth', 'isModerator'], // FIXME move to UserController
    addModerator:    ['sessionAuth', 'isModerator'],
    removeModerator: ['sessionAuth', 'isModerator'],
    removeMember:    ['sessionAuth', 'isModerator'],
    leave:           ['sessionAuth', 'checkAndSetMembership'],
    updateMembership:['sessionAuth', 'checkAndSetMembership'],
    validate:        true,
    create:          ['sessionAuth'],
    findForNetwork:  ['sessionAuth', 'inNetwork'],
    joinWithCode:    ['sessionAuth']
  },

  PostController: {
    findOne:                              ['allowPublicAccess', 'sessionAuth', 'checkAndSetPost'],
    findForCommunity:                     ['allowPublicAccess', 'allowTokenAuth', 'sessionAuth', 'checkAndSetMembership'],
    checkFreshnessForCommunity:           ['allowPublicAccess', 'allowTokenAuth', 'sessionAuth', 'checkAndSetMembership'],
    findForUser:                          ['sessionAuth', 'inSameCommunityOrNetwork'],
    checkFreshnessForUser:                ['sessionAuth', 'inSameCommunityOrNetwork'],
    findForNetwork:                       ['sessionAuth', 'inNetwork'],
    checkFreshnessForNetwork:             ['sessionAuth', 'inNetwork'],
    create:                               ['sessionAuth', 'inCommunities'],
    update:                               ['sessionAuth', 'checkAndSetWritablePost'],
    follow:                               ['sessionAuth', 'checkAndSetPost'],
    respond:                              ['sessionAuth', 'checkAndSetPost'],
    findForFollowed:                      ['sessionAuth', 'isSelf'],
    checkFreshnessForFollowed:            ['sessionAuth', 'isSelf'],
    findForAllForUser:                    ['sessionAuth', 'isSelf'],
    checkFreshnessForAllForUser:          ['sessionAuth', 'isSelf'],
    findForTagInAllCommunities:           ['allowPublicAccess', 'allowTokenAuth', 'sessionAuth', 'checkAndSetMembership'],
    checkFreshnessForTagInAllCommunities: ['allowPublicAccess', 'allowTokenAuth', 'sessionAuth', 'checkAndSetMembership'],
    fulfill:                              ['sessionAuth', 'checkAndSetOwnPost'],
    vote:                                 ['sessionAuth', 'checkAndSetPost'],
    complain:                             ['sessionAuth', 'checkAndSetPost'],
    destroy:                              ['sessionAuth', 'checkAndSetWritablePost'],
    createFromEmail: true,
    createFromEmailForm: true
  },

  CommentController: {
    create:          ['sessionAuth', 'checkAndSetPost'],
    thank:           ['sessionAuth'],
    findForPost:     ['allowPublicAccess', 'sessionAuth', 'checkAndSetPost'],
    destroy:         ['sessionAuth', 'isCommentOwner'],
    createFromEmail: true
  },

  MessageController: {
    relayFromEmail: true,
    createWaitlistRequest: true
  },

  DeviceController: {
    create:           ['sessionAuth'],
    destroy:          ['sessionAuth'],
    updateBadgeNo:    ['sessionAuth']
  },

  NetworkController: {
    findOne: ['sessionAuth', 'inNetwork'],
    create:  ['sessionAuth'],
    update:  ['sessionAuth', 'inNetwork'],
    validate:        true
  },

  SubscriptionController: {
    create: true
  },

  NexudusController: true,
  MobileAppController: true,
  LiveStatusController: true,

  TagController: {
    findOne: ['sessionAuth'],
    findOneInCommunity: ['allowPublicAccess', 'allowTokenAuth', 'sessionAuth', 'checkAndSetMembership'],
    findFollowed: ['allowPublicAccess', 'allowTokenAuth', 'sessionAuth', 'checkAndSetMembership'],
    findForLeftNav: ['allowPublicAccess', 'allowTokenAuth', 'sessionAuth', 'checkAndSetMembership'],
    follow: ['allowTokenAuth', 'sessionAuth']
  }

}
