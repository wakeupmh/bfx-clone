const OPERATION_TYPE = require("../src/order").OPERATION_TYPE;
const fs = require("node:fs").promises;
const Lock = require("../src/lock");
const OrderBook = require("../src/order-book");

jest.mock("node:fs/promises");

describe("OrderBook", () => {
	let orderBook;

	beforeEach(() => {
		orderBook = new OrderBook("test-storage.json", Lock);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	test("should add a buy order and persist state", async () => {
		jest.spyOn(fs, "writeFile").mockResolvedValue();
		const order = {
			id: "1",
			operation: OPERATION_TYPE.BUY,
			price: 100,
			amount: 10,
			timestamp: Date.now(),
		};

		await orderBook.addOrder(order);

		expect(orderBook.buyOrders.length).toBe(1);
		expect(orderBook.buyOrders[0]).toEqual(order);
		expect(fs.writeFile).toHaveBeenCalledWith(
			"test-storage.json",
			JSON.stringify({
				buyOrders: [order],
				sellOrders: [],
			}),
		);
	});

	test("should add a sell order and persist state", async () => {
		jest.spyOn(fs, "writeFile").mockResolvedValue();
		const order = {
			id: "1",
			operation: OPERATION_TYPE.SELL,
			price: 200,
			amount: 5,
			timestamp: Date.now(),
		};

		await orderBook.addOrder(order);

		expect(orderBook.sellOrders.length).toBe(1);
		expect(orderBook.sellOrders[0]).toEqual(order);
		expect(fs.writeFile).toHaveBeenCalledWith(
			"test-storage.json",
			JSON.stringify({
				buyOrders: [],
				sellOrders: [order],
			}),
		);
	});

	test("should match buy and sell orders and return matched orders", async () => {
		jest.spyOn(fs, "writeFile").mockResolvedValue();
		const buyOrder = {
			id: "1",
			operation: OPERATION_TYPE.BUY,
			price: 100,
			amount: 10,
			timestamp: Date.now(),
		};
		const sellOrder = {
			id: "2",
			operation: OPERATION_TYPE.SELL,
			price: 100,
			amount: 5,
			timestamp: Date.now(),
		};

		await orderBook.addOrder(buyOrder);
		await orderBook.addOrder(sellOrder);

		const matchedOrders = await orderBook.matchOrders();

		expect(matchedOrders).toEqual([
			{ buyOrderId: "1", sellOrderId: "2", amount: 5, price: 100 },
		]);
		expect(orderBook.buyOrders[0].amount).toBe(5);
		expect(orderBook.sellOrders.length).toBe(0);
		expect(fs.writeFile).toHaveBeenCalledTimes(3);
	});

	test("should persist state after matching orders", async () => {
		jest.spyOn(fs, "writeFile").mockResolvedValue();
		const buyOrder = {
			id: "1",
			operation: OPERATION_TYPE.BUY,
			price: 100,
			amount: 10,
			timestamp: Date.now(),
		};
		const sellOrder = {
			id: "2",
			operation: OPERATION_TYPE.SELL,
			price: 100,
			amount: 5,
			timestamp: Date.now(),
		};

		await orderBook.addOrder(buyOrder);
		await orderBook.addOrder(sellOrder);
		await orderBook.matchOrders();

		expect(fs.writeFile).toHaveBeenCalledWith(
			"test-storage.json",
			expect.any(String),
		);
	});

	test("should synchronize orders from multiple states", async () => {
		jest.spyOn(fs, "writeFile").mockResolvedValue();
		const state1 = {
			buyOrders: [{ id: "1", price: 100, amount: 10, timestamp: Date.now() }],
			sellOrders: [],
		};
		const state2 = {
			buyOrders: [],
			sellOrders: [{ id: "2", price: 200, amount: 5, timestamp: Date.now() }],
		};

		await orderBook.synchronize([state1, state2]);

		expect(orderBook.buyOrders.length).toBe(1);
		expect(orderBook.sellOrders.length).toBe(1);
		expect(fs.writeFile).toHaveBeenCalledWith(
			"test-storage.json",
			expect.any(String),
		);
	});

	test("should load state from file", async () => {
		jest.spyOn(fs, "readFile").mockResolvedValue();
		const state = {
			buyOrders: [{ id: "1", price: 100, amount: 10, timestamp: Date.now() }],
			sellOrders: [{ id: "2", price: 200, amount: 5, timestamp: Date.now() }],
		};
		fs.readFile.mockResolvedValueOnce(JSON.stringify(state));

		await orderBook.loadState();

		expect(orderBook.buyOrders).toEqual(state.buyOrders);
		expect(orderBook.sellOrders).toEqual(state.sellOrders);
	});

	test("should handle file not found when loading state", async () => {
		jest.spyOn(fs, "readFile").mockResolvedValue();
		const error = new Error("File not found");
		error.code = "ENOENT";
		fs.readFile.mockRejectedValueOnce(error);

		await expect(orderBook.loadState()).resolves.not.toThrow();
		expect(orderBook.buyOrders).toEqual([]);
		expect(orderBook.sellOrders).toEqual([]);
	});
});
