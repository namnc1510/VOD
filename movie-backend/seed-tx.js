const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' });
const User = require('./src/models/user.model');
const Transaction = require('./src/models/transaction.model');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find().limit(3);
    if (users.length === 0) { console.log('No users found.'); process.exit(0); }

    const txs = [
      { user: users[0]._id, amount: 49000, currency: 'VND', planPurchased: 'standard', billingCycle: 'monthly', status: 'completed' },
      { user: users[1] ? users[1]._id : users[0]._id, amount: 89000, currency: 'VND', planPurchased: 'premium', billingCycle: 'monthly', status: 'completed' },
      { user: users[0]._id, amount: 149000, currency: 'VND', planPurchased: 'ultimate', billingCycle: 'monthly', status: 'pending' },
      { user: users[2] ? users[2]._id : users[0]._id, amount: 49000, currency: 'VND', planPurchased: 'standard', billingCycle: 'monthly', status: 'failed' }
    ];

    await Transaction.insertMany(txs);
    console.log('Successfully inserted 4 mock transactions.');
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}
seed();
