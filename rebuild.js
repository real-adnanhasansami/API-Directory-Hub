// Optional: re-parse a fresh copy of the API-mega-list repo.
// Unzip the repo into this folder as ./API-mega-list-main first, then run this from the Pinokio menu.
module.exports = {
  run: [
    {
      method: "shell.run",
      params: { message: "node tools/build-data.mjs API-mega-list-main public/data/apis.json" }
    }
  ]
}
