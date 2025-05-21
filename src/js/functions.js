export const randomRoamImage = (category = "default") => {
  console.log("here")
  const roamImageCategories = {
    beaches: ["beach1.jpg", "beach2.jpg", "beach3.jpg"],
    jungle: ["jungle1.jpg", "jungle2.jpg", "jungle3.jpg"],
    volcanoes: ["volcano1.jpg", "volcano2.jpg"],
    default: ["1.jpg", "4.jpg", "5.jpg", "6.jpg"],
  }

  const selectedArray =
    roamImageCategories[category] || roamImageCategories["default"]
  const randomIndex = getRandom(selectedArray)
  return `<img src="/img/roam/${category}/${selectedArray[randomIndex]}" alt="Travel Image" />`
}

export const getRandom = inputArray => {
  const random = Math.floor(Math.random() * inputArray.length)
  return random
}

export const randomQuote = () => {
  const quoteArray = [
    `"Not all those who wander are lost." — J.R.R. Tolkien`,
    `"The real voyage of discovery consists not in seeking new landscapes, but in having new eyes." — Marcel Proust`,
    `"Collect moments, not things." — Unknown`,
    `"Photography is the pause button of life." — Ty Holland`,
    `"The best stories are the ones we live." — Roam with Justin`,
    `"In the end, we only regret the chances we didn’t take." — Lewis Carroll (attributed)`,
    `"It’s not about the destination. It’s about the feeling you carry home." — Roam with Justin`,
    `"Take only pictures, leave only footprints." — Unknown`,
    `"We travel not to escape life, but for life not to escape us." — Unknown`,
  ]

  const random = getRandom(quoteArray)
  const quote = quoteArray[random]
  return quote
}
export const updatePageNumber = (i, text) => {
  let pageNo = i
  let newValue = "Page " + pageNo + "/" + Object.keys(text).length
  return {
    newValue,
    i,
  }
}
export const redirectNotFound = () => {
  window.location.href = "/"
}
