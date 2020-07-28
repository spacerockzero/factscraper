const { expect } = require('chai')
const { beforeBlanks } = require('./mocks')
const { addBlank, pronouns } = require('../scrapers/factslides')

describe('addBlank', () => {
  it('should choose a noun blank', async () => {
    const withBlanks = await addBlank(beforeBlanks)
    expect(withBlanks[0].blank).to.not.be.undefined
    expect(withBlanks[0].blank).to.be.a('string')
  })

  it('should make a string with the blank removed', async () => {
    const withBlanks = await addBlank(beforeBlanks)
    expect(withBlanks[0].blanked).to.not.be.undefined
    expect(withBlanks[0].blanked).to.be.a('string')
  })

  it('should add synonyms for the blank noun', async () => {
    const withBlanks = await addBlank(beforeBlanks)
    expect(withBlanks[0].blankSynonyms).to.not.be.undefined
    expect(withBlanks[0].blankSynonyms).to.be.a('array')
  })

  it('blank noun should not be a pronoun', async () => {
    const withBlanks = await addBlank(beforeBlanks)
    expect(withBlanks[4].blank).to.not.equal('It')
  })
})