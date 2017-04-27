// this file tests graphql-bookshelf-bridge internals; when that is made into a
// standalone library, this should go with it.

import { makeModelLoader } from '../../../lib/graphql-bookshelf-bridge/util/initDataLoaders'

const MockModel = {
  where: function () {
    return {
      fetchAll: () => Promise.resolve(this.mockData)
    }
  }
}

describe('makeModelLoader', () => {
  var loader

  beforeEach(() => {
    loader = makeModelLoader(MockModel)
  })

  it('works with database tables with integer ids', () => {
    MockModel.mockData = [{id: 1}, {id: 2}, {id: 3}]

    return loader.loadMany(['3', '1', '2']).then(results => {
      expect(results).to.deep.equal([{id: 3}, {id: 1}, {id: 2}])
    })
  })

  it('works with database tables with bigint ids', () => {
    MockModel.mockData = [{id: '1'}, {id: '2'}, {id: '3'}]

    return loader.loadMany(['3', '1', '2']).then(results => {
      expect(results).to.deep.equal([{id: '3'}, {id: '1'}, {id: '2'}])
    })
  })
})
