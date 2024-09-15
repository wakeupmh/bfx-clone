const { PeerRPCClient } = require("grenache-nodejs-http");
const Link = require("grenache-nodejs-link");

class ExchangeClient {
	constructor(grapeAddress) {
		this.link = new Link({
			grape: grapeAddress,
		});
		this.link.start();

		this.peer = new PeerRPCClient(this.link, {});
		this.peer.init();
	}

	submitOrder(order) {
		return new Promise((resolve, reject) => {
			this.peer.request(
				"p2pExchange",
				{
					action: "submitOrder",
					order,
					apiKey: "valid_api_key",
				},
				{ timeout: 10000 },
				(err, result) => {
					if (err) reject(err);
					else resolve(result);
				},
			);
		});
	}

	getState() {
		return new Promise((resolve, reject) => {
			this.peer.map(
				"p2pExchange",
				{
					action: "getState",
					apiKey: "valid_api_key",
				},
				{ timeout: 10000 },
				(err, result) => {
					if (err) reject(err);
					else resolve(result);
				},
			);
		});
	}
}

const grapeAddress = "http://127.0.0.1:30001";
const client = new ExchangeClient(grapeAddress);

async function runClient() {
	try {
		console.log("Submitting orders...", grapeAddress);
		const buyOrderResult = await client.submitOrder({
			operation: "buy",
			price: 100,
			amount: 10,
			userId: "user1",
		});
		console.log("Buy order submitted:", buyOrderResult);

		const sellOrderResult = await client.submitOrder({
			operation: "sell",
			price: 99,
			amount: 5,
			userId: "user2",
		});
		console.log("Sell order submitted:", sellOrderResult);

		const state = await client.getState();
		console.log("Current state:", state);
	} catch (error) {
		console.error("Error:", error);
	}
}

runClient();
