export const OPERATION_TYPE = {
  BUY: 'buy',
  SELL: 'sell',
}

export class Order {
  constructor({
    operation,
    price,
    amount,
    userId,
  }) {
    this.id = crypto.randomUUID()
    this.operation = operation
    this.price = price
    this.amount = amount
    this.timestamp = Date.now()
    this.userId = userId
  }
}
