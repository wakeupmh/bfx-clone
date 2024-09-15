const OPERATION_TYPE = require("./order").OPERATION_TYPE;
const fs = require("fs").promises;

class OrderBook {
	constructor(storageFile, Lock) {
		this.buyOrders = [];
		this.sellOrders = [];
		this.lock = new Lock();
		this.storageFile = storageFile;
	}

	async addOrder(order) {
		await this.lock.acquire();
		try {
			if (order.operation === OPERATION_TYPE.BUY) {
				this.buyOrders.push(order);
				this.buyOrders.sort(
					(a, b) => b.price - a.price || a.timestamp - b.timestamp,
				);
			} else {
				this.sellOrders.push(order);
				this.sellOrders.sort(
					(a, b) => a.price - b.price || a.timestamp - b.timestamp,
				);
			}
			await this.persistState();
		} catch (error) {
			console.error("Error adding order:", error);
			throw error;
		} finally {
			this.lock.release();
		}
	}

	async matchOrders() {
		await this.lock.acquire();
		try {
			const matchedOrders = [];
			while (this.buyOrders.length > 0 && this.sellOrders.length > 0) {
				const topBuy = this.buyOrders[0];
				const topSell = this.sellOrders[0];

				if (topBuy.price >= topSell.price) {
					const matchedAmount = Math.min(topBuy.amount, topSell.amount);
					topBuy.amount -= matchedAmount;
					topSell.amount -= matchedAmount;

					matchedOrders.push({
						buyOrderId: topBuy.id,
						sellOrderId: topSell.id,
						amount: matchedAmount,
						price: topSell.price,
					});

					if (topBuy.amount === 0) this.buyOrders.shift();
					if (topSell.amount === 0) this.sellOrders.shift();
				} else {
					break;
				}
			}
			await this.persistState();
			return matchedOrders;
		} catch (error) {
			console.error("Error matching orders:", error);
			throw error;
		} finally {
			this.lock.release();
		}
	}

	async getState() {
		return {
			buyOrders: this.buyOrders,
			sellOrders: this.sellOrders,
		};
	}

	async synchronize(states) {
		await this.lock.acquire();
		try {
			let allBuyOrders = this.buyOrders;
			let allSellOrders = this.sellOrders;

			for (const state of states) {
				allBuyOrders = allBuyOrders.concat(state.buyOrders);
				allSellOrders = allSellOrders.concat(state.sellOrders);
			}

			this.buyOrders = Array.from(
				new Map(allBuyOrders.map((order) => [order.id, order])).values(),
			).sort((a, b) => b.price - a.price || a.timestamp - b.timestamp);
			this.sellOrders = Array.from(
				new Map(allSellOrders.map((order) => [order.id, order])).values(),
			).sort((a, b) => a.price - b.price || a.timestamp - b.timestamp);

			await this.persistState();
		} catch (error) {
			console.error("Error synchronizing state:", error);
			throw error;
		} finally {
			this.lock.release();
		}
	}

	async persistState() {
		const state = await this.getState();
		await fs.writeFile(this.storageFile, JSON.stringify(state));
	}

	async loadState() {
		try {
			const data = await fs.readFile(this.storageFile, "utf8");
			const state = JSON.parse(data);
			this.buyOrders = state.buyOrders;
			this.sellOrders = state.sellOrders;
		} catch (error) {
			console.log("Error loading state:", error);
			if (error.code !== "ENOENT") {
				throw error;
			}
		}
	}
}

module.exports = OrderBook;
