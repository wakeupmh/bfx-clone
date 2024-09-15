const Exchange = require("../src/server/exchange");
const OrderBook = require("../src/server/order-book");
const { Order } = require("../src/server/order");
const { PeerRPCServer } = require("grenache-nodejs-http");
const Link = require("grenache-nodejs-link");

jest.mock("grenache-nodejs-http");
jest.mock("grenache-nodejs-link");
jest.mock("../src/server/order-book");
jest.useFakeTimers();

describe("Exchange", () => {
	let exchange;
	let orderBookMock;

	beforeEach(() => {
		orderBookMock = {
			addOrder: jest.fn(),
			matchOrders: jest.fn().mockResolvedValue([]),
			getState: jest.fn().mockResolvedValue({
				buyOrders: [],
				sellOrders: [],
			}),
			loadState: jest.fn().mockResolvedValue(),
			synchronize: jest.fn().mockResolvedValue(),
		};
		OrderBook.mockImplementation(() => orderBookMock);

		Link.mockImplementation(() => ({
			start: jest.fn(),
			announce: jest.fn(),
		}));

		PeerRPCServer.mockImplementation(() => ({
			init: jest.fn(),
			transport: jest.fn(() => ({
				listen: jest.fn(),
				on: jest.fn(),
			})),
		}));

		exchange = new Exchange(3000, "test-storage.json");

		exchange.client = {
			map: jest.fn((service, payload, options, callback) => callback(null, [])),
		};
	});

	it("should initialize the order book on start", async () => {
		await exchange.initialize();
		expect(orderBookMock.loadState).toHaveBeenCalled();
	});

	it("should handle valid API key in requests", async () => {
		const handler = {
			reply: jest.fn(),
		};
		const payload = {
			action: "getState",
			apiKey: "xYzAbC123",
		};

		await exchange.handleRequest(null, null, payload, handler);
		expect(handler.reply).toHaveBeenCalledWith(null, {
			buyOrders: [],
			sellOrders: [],
		});
	});

	it("should reject invalid API key in requests", async () => {
		const handler = {
			reply: jest.fn(),
		};
		const payload = {
			action: "getState",
			apiKey: "invalid_key",
		};

		await exchange.handleRequest(null, null, payload, handler);
		expect(handler.reply).toHaveBeenCalledWith(new Error("Invalid API key"));
	});

	it("should handle invalid actions", async () => {
		const handler = {
			reply: jest.fn(),
		};
		const payload = {
			action: "invalidAction",
			apiKey: "xYzAbC123",
		};

		await exchange.handleRequest(null, null, payload, handler);
		expect(handler.reply).toHaveBeenCalledWith(new Error("Invalid action"));
	});

	it("should submit an order and match orders", async () => {
		const orderPayload = {
			type: "buy",
			price: 100,
			amount: 10,
			userId: "user1",
		};

		new Order({
			id: "order1",
			...orderPayload,
		});

		await exchange.submitOrder(orderPayload);

		expect(orderBookMock.addOrder).toHaveBeenCalledWith(expect.any(Order));
		expect(orderBookMock.matchOrders).toHaveBeenCalled();
	});

	it("should broadcast an order after submission", async () => {
		exchange.client = {
			map: jest.fn((service, payload, options, callback) => callback(null, [])),
		};
		const orderPayload = {
			type: "buy",
			price: 100,
			amount: 10,
			userId: "user1",
		};

		await exchange.submitOrder(orderPayload);
		expect(exchange.client.map).toHaveBeenCalledWith(
			"p2pExchange",
			expect.objectContaining({ action: "submitOrder", order: orderPayload }),
			{ timeout: 10000 },
			expect.any(Function),
		);
	});

	it("should synchronize the order book periodically", () => {
		exchange.client = {
			map: jest.fn((service, payload, options, callback) =>
				callback(null, [{ buyOrders: [], sellOrders: [] }]),
			),
		};

		exchange.synchronizeOrderBook();
		expect(exchange.client.map).toHaveBeenCalledWith(
			"p2pExchange",
			expect.objectContaining({ action: "getState", apiKey: "valid_api_key" }),
			{ timeout: 10000 },
			expect.any(Function),
		);
	});

	it("should correctly schedule periodic tasks", () => {
		jest.advanceTimersByTime(1000);
		expect(exchange.link.announce).toHaveBeenCalled();

		jest.advanceTimersByTime(10000);
		expect(exchange.client.map).toHaveBeenCalledWith(
			"p2pExchange",
			expect.objectContaining({ action: "getState", apiKey: "valid_api_key" }),
			{ timeout: 10000 },
			expect.any(Function),
		);
	});
});
