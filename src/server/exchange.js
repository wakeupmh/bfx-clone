const { PeerRPCServer, PeerRPCClient } = require("grenache-nodejs-http");
const Link = require("grenache-nodejs-link");
const OrderBook = require("./order-book");
const { Order } = require("./order");
const Lock = require("./lock");

class Exchange {
	constructor(port, storageFile) {
		this.orderBook = new OrderBook(storageFile, Lock);
		this.port = port;

		this.link = new Link({
			grape: "http://127.0.0.1:30001",
		});
		this.link.start();

		this.peer = new PeerRPCServer(this.link, {
			timeout: 300000,
		});
		this.peer.init();

		this.service = this.peer.transport("server");
		this.service.listen(this.port);

		setInterval(() => {
			this.link.announce("p2pExchange", this.service.port, {});
		}, 1000);

		this.service.on("request", this.handleRequest.bind(this));

		this.client = new PeerRPCClient(this.link, {});
		this.client.init();

		setInterval(this.synchronizeOrderBook.bind(this), 10000);
	}

	async initialize() {
		await this.orderBook.loadState();
	}

	async handleRequest(rid, key, payload, handler) {
		const { action, order, state, apiKey } = payload;

		if (!this.isValidApiKey(apiKey)) {
			console.error("Invalid API key");
			handler.reply(new Error("Invalid API key"));
			return;
		}

		const actions = {
			submitOrder: async () => {
				await this.submitOrder(order);
				handler.reply(null, { success: true });
			},
			getState: async () => {
				const currentState = await this.orderBook.getState();
				handler.reply(null, currentState);
			},
		};

		try {
			if (actions[action]) {
				await actions[action]();
			} else {
				console.error("Invalid action");
				handler.reply(new Error("Invalid action"));
			}
		} catch (error) {
			console.error("Error handling request:", error);
			handler.reply(error);
		}
	}

	isValidApiKey(apiKey) {
		return apiKey === "valid_api_key";
	}

	async submitOrder(order) {
		const newOrder = new Order(
			order.operation,
			order.price,
			order.amount,
			order.userId,
		);
		await this.orderBook.addOrder(newOrder);
		const matchedOrders = await this.orderBook.matchOrders();
		// this.broadcastOrder(order);
		return { orderId: newOrder.id, matches: matchedOrders };
	}

	broadcastOrder(order) {
		return this.client.map(
			"p2pExchange",
			{ action: "submitOrder", order, apiKey: "valid_api_key" },
			{ timeout: 10000 },
			(err, results) => {
				if (err) {
					console.error("Error broadcasting order:", err);
				} else {
					console.log("Order broadcast results:", results);
					return results;
				}
			},
		);
	}

	synchronizeOrderBook() {
		this.client.map(
			"p2pExchange",
			{ action: "getState", apiKey: "valid_api_key" },
			{ timeout: 10000 },
			(err, results) => {
				if (err) {
					console.error("Error synchronizing order book:", err);
					return;
				}
				const validStates = results.filter(
					(res) => res?.buyOrders && res?.sellOrders,
				);
				if (validStates.length > 0) {
					this.orderBook
						.synchronize(validStates)
						.catch((error) =>
							console.error("Error during state synchronization:", error),
						);
				}
			},
		);
	}
}

module.exports = Exchange;
