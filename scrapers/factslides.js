
const puppeteer = require('puppeteer')
const fs = require('fs').promises

const URL = 'https://factslides.com/'
const dest = 'data/facts.json'

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

  // console.log('categoryLinks', categoryLinks)
  const allFacts = []
  const length = categoryLinks.length
  // const length = 3

  // go to category pages
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
    // console.log('flatFacts', flatFacts)
    return flatFacts
  } catch (error) {
    console.error(error)
  }
}

async function save(facts) {
  console.log('facts to write:', facts)
  const written = await fs.writeFile(dest, JSON.stringify(facts, null, 2), 'utf8')
  console.log('written flat', written)
  return written
}

async function run() {
  console.log('scraping facts...')
  const scraped = await scrape()
  console.log('flattening data...')
  const flattened = await flatten(scraped)
  console.log('saving data...')
  const saved = await save(flattened)
  console.log('done!', saved)
}

run()
