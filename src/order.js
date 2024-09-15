const OPERATION_TYPE = Object.freeze({
  BUY: "buy",
  SELL: "sell",
});

class Order {
  constructor({ operation, price, amount, userId }) {
    this.id = crypto.randomUUID();
    this.operation = operation;
    this.price = price;
    this.amount = amount;
    this.timestamp = Date.now();
    this.userId = userId;
  }
}

module.exports = {
  Order,
  OPERATION_TYPE,
};
