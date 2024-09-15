## Description
This project is a simple example of p2p communication using the framework [**Grenache**](https://github.com/bitfinexcom/grenache-grape).

The project consists of a server and a client that communicate with each other through the **Grapes network**.

## Issues and required improvements
- The server when receive an order from the client and try to broadcast the order to all clients, it is not working properly, because it seems to be infinite looping, I've tried to fix it, but I couldn't find the issue
- The sync order is not working properly, because the server is not correctly connecting to the grapes
- I've tried to user docker to run the grapes, but I had some issues with the network, so I decided to run the grapes in the terminal
- I've implemented the Lock class to avoid concurrency issues in a simple way, but if we need to scale the server, we need to implement a more robust solution, like a distributed locking mechanism or use a consensus algorithm
- The current implementation has minimal error handling. In a production system, we'd want to add more robust error handling and edge case management
- The current implementation has minimal logging. In a production system, we'd want to add more robust logging to help with debugging and monitoring
- The orderbook is kept in a json file. For a more robust system, we'd want to persist the orderbook to database or a volume

## Run the project
First, install the **Grape** and the project dependencies:

*grape*
```bash
npm i -g grenache-grape
```
*project dependencies*
```
npm install
```
Then, run the following commands in separate terminals:
### Run the grapes
```bash
grape -b 127.0.0.1 --dp 20001 --dc 32 --aph 30001 --bn '127.0.0.1:20002,127.0.0.1:20003'
grape --dp 20002 --aph 40001 --dc 32 --bn '127.0.0.1:20001,127.0.0.1:20003'
grape --dp 20003 --aph 50001 --dc 32 --bn '127.0.0.1:20001,127.0.0.1:20002'
```
### Run the server and client
For the server and client, run the following commands:

*server*
```bash
 npm run server
```
*client*
```bash
npm run client
```

## Tests
To run the tests, run the following command:
```bash
npm test
```
