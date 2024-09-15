class Lock {
  constructor() {
    this.locked = false;
  }

  async acquire() {
    while (this.locked) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    this.locked = true;
  }

  release() {
    this.locked = false;
  }
}
