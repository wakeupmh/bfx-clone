const Exchange = require("./exchange");
const port = process.env.PORT || 8080;
const storageFile = process.env.STORAGE_FILE || "./orderbook.json";
const grapeAddress = 'http://127.0.0.1:30001'

const exchange = new Exchange(port, storageFile, grapeAddress);

exchange
  .initialize()
  .then(() => {
    console.log("Exchange running in", grapeAddress);
  })
  .catch((error) => console.error("Initialization failed:", error));
