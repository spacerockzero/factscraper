
const puppeteer = require('puppeteer')
const WordPOS = require('wordpos')
const wordpos = new WordPOS()
const fs = require('fs').promises
const md5 = require('md5')

const URL = 'https://factslides.com/'
const dest = 'data/facts.json'
const familyDest = 'data/factsFamily.json'
const scrapedDest = 'data/factsScraped.json'

const pronouns = [
  'it',
  'i',
  'you',
  'he',
  'they',
  'we',
  'she',
  'who',
  'them',
  'me',
  'him',
  'one',
  'her',
  'us',
  'something',
  'nothing',
  'anything',
  'himself',
  'everything',
  'someone',
  'themselves',
  'everyone',
  'itself',
  'anyone',
  'myself',
]

const unfunnyTopics = [
  '9/11 Facts',
  'Abortion Facts',
  'Animal Testing Facts',
  'Anne Frank Facts',
  'Auschwitz Facts',
  'Death Penalty Facts',
  'Hitler Facts',
  'Suicide Facts',
  'Slavery Facts',
  'Auschwitz Facts',
  'Breast Cancer Facts',
  'Jesus Facts',
]

const unfunnyIds = [
  'df7663d1c42ebd248709669eb67e055d'
]

// scrape for facts
async function scrape() {
  console.log('getting facts...')
  const browser = await puppeteer.launch({
    args: ['--no-sandbox'],
    // headless: false,
    // slowMo: 0,
  })
  const page = await browser.newPage()
  page.setJavaScriptEnabled(false)
  // go to homepage
  await page.goto(URL)
  const date = new Date().toJSON()
  console.log('date', date)
  // get category links from homepage
  const categoryLinks = await page.evaluate(() => {
    const linkEls = document.querySelectorAll('.trending_item_title a')
    const linkArr = [...linkEls].map(linkEl => {
      return {
        name: linkEl.innerText,
        href: linkEl.href
      }
    })
    return linkArr
  })
  const allFacts = []
  const length = categoryLinks.length
  // const length = 3
  // go to category pages serially, to be nice to their server
  for (let index = 0; index < length; index++) {
    // go there
    await page.goto(categoryLinks[index].href)
    // extract facts from category page
    const facts = await page.evaluate(() => {
      const divs = document.querySelectorAll('.i:not(#fe)')
      const info = [...divs].map(div => {
        debugger
        const id = div.id
        console.log('id', id)
        const infoDiv = document.querySelector(`#${id}t1 > div > div`)
        if (infoDiv) {
          var factText = infoDiv.innerText
          if (factText) {
            // clean it up
            factText = factText.replace('♦ SOURCE ♺ SHARE', '')
            factText = factText.replaceAll('  ', ' ')
            factText = factText.trim()
          }
          var sourceA = infoDiv.querySelector('a')
          if (sourceA) {
            var source = sourceA.href
          }
        }
        if (factText && source) {
          return { text: factText, source }
        } else {
          return null
        }
      }).filter(item => item !== null)
      return info
    })
    console.log('facts', facts)
    allFacts.push({ category: categoryLinks[index].name, facts })
  }
  // shut'r down
  await browser.close()
  return { date, facts: allFacts }
}


async function flatten(categorizedData) {
  try {
    const factsByCategory = categorizedData.facts
    // console.log('factsByCategory', factsByCategory)
    const flatFacts = []
    factsByCategory.forEach(cat => {
      cat.facts.forEach(fact => {
        flatFacts.push({
          credit: 'https://factslides.com',
          category: cat.category,
          ...fact
        })
      })
    })
    return flatFacts
  } catch (error) {
    console.error(error)
  }
}


async function addBlank(flatData) {
  try {
    const withBlanks = flatData.map(async factObj => {
      var blank = ''
      const POS = await wordpos.getPOS(factObj.text)
      // filter nouns that are also possibly other parts of speech
      const nonredundant = POS.nouns.filter(noun => {
        if (POS.verbs.includes(noun)) return false
        if (POS.adjectives.includes(noun)) return false
        if (POS.adverbs.includes(noun)) return false
        return true
      })
      // filter numbers
      const noNumbers = nonredundant.filter(noun => {
        const isNum = !!parseInt(noun)
        return isNum === false
      })
      // ignore pronouns
      const noPronouns = noNumbers.filter(noun => {
        const lowered = noun.toLowerCase()
        return !pronouns.includes(lowered)
      })
      // get probably proper nouns
      // const uppers = noPronouns.filter(noun => noun[0] === noun[0].toUpperCase())
      // if (uppers.length > 0) {
      //   blank = uppers[Math.floor(Math.random() * uppers.length)];
      // } else {
      blank = noPronouns[Math.floor(Math.random() * noPronouns.length)];
      // }
      if (!blank) return {}
      factObj.blank = blank || ''
      const regex = new RegExp(`${blank}`, 'g')
      factObj.blanked = factObj.text.replace(regex, '_______')
      const wordlup = await wordpos.lookupNoun(blank)
      factObj.blankSynonyms = wordlup[0].synonyms
      return factObj
    })
    return Promise.all(withBlanks)
  } catch (error) {
    console.error(error)
  }
}


function filterEmpty(facts) {
  const filtered = facts.filter(value => Object.keys(value).length !== 0)
  return filtered
}


function addIds(facts) {
  const withIds = facts.map(fact => {
    if (!fact || !fact.text) return {}
    const id = md5(fact.text)
    fact.id = id
    return fact
  })
  return withIds.filter(value => Object.keys(value).length !== 0)
}


function filterFamilyMode(facts) {
  const filtered = facts.filter(fact => {
    return !(unfunnyTopics.includes(fact.category) || unfunnyIds.includes(fact.id))
  })
  return filtered
}


async function saveScrape(facts) {
  console.log('facts to write:', facts)
  const written = await fs.writeFile(scrapedDest, JSON.stringify(facts, null, 2), 'utf8')
  console.log('written flat', written)
  return written
}


async function readScrape() {
  const scraped = await fs.readFile(scrapedDest, 'utf8')
  console.log('read scraped', scraped)
  return JSON.parse(scraped)
}


async function save(facts, path = dest) {
  console.log('facts to write:', facts)
  const written = await fs.writeFile(path, JSON.stringify(facts, null, 2), 'utf8')
  console.log('written flat', written)
  return written
}



// process managers
async function justScrape() {
  console.log('scraping facts...')
  const scraped = await scrape()
  // save scraped for faster use later
  await saveScrape(scraped)
}


async function dotherest(scraped) {
  console.log('doing the rest...')
  console.log('flattening data...')
  const flattened = await flatten(scraped)

  console.log('adding blanks...')
  const withBlanks = await addBlank(flattened)

  console.log('adding ids to identify individual facts...')
  const withIds = addIds(withBlanks)

  console.log('removing empty objects...')
  const normalFacts = filterEmpty(withIds)

  console.log('making familymode facts file also...')
  const filtered = filterFamilyMode(normalFacts)

  console.log('saving data...')
  const saved = await save(normalFacts)
  const saveFamily = await save(filtered, familyDest)

  console.log('done!', saved, saveFamily)
}


async function run() {
  const scraped = await justScrape()
  await dotherest(scraped)
}


async function runAfterScrape() {
  console.log('reading data from last scrape...')
  const scraped = await readScrape()
  await dotherest(scraped)
}


module.exports = {
  scrape, flatten, addBlank, save, run, runAfterScrape, pronouns
}
