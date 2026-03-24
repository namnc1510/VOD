const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const User = require('../models/user.model');
const Transaction = require('../models/transaction.model');

async function generateFakeTransactions() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/movie-app', {});
    console.log('Connected to MongoDB');

    await Transaction.deleteMany({});
    console.log('Cleared existing transactions');

    // Get subset of users
    const users = await User.find({ role: 'user' }).limit(50);
    if (!users.length) {
      console.log('No users found. Please create users first.');
      process.exit(0);
    }

    const plans = [
      { name: 'standard', monthlyPrice: 49000, weight: 0.5 },
      { name: 'premium', monthlyPrice: 89000, weight: 0.35 },
      { name: 'ultimate', monthlyPrice: 149000, weight: 0.15 }
    ];

    const today = new Date();
    const transactions = [];
    const NUM_TRANSACTIONS = 450; // Random transactions across 6 months

    for (let i = 0; i < NUM_TRANSACTIONS; i++) {
        const _user = users[Math.floor(Math.random() * users.length)];
        
        // Random date within last 180 days
        const daysAgo = Math.floor(Math.random() * 180);
        const createdAt = new Date(today);
        createdAt.setDate(createdAt.getDate() - daysAgo);
        
        // Determine plan by weight
        const rand = Math.random();
        let selectedPlan = plans[0];
        let runningWeight = 0;
        for (const p of plans) {
            runningWeight += p.weight;
            if (rand <= runningWeight) {
                selectedPlan = p;
                break;
            }
        }

        const isAnnual = Math.random() < 0.2; // 20% chance of annual
        const billingCycle = isAnnual ? 'annual' : 'monthly';
        let amount = selectedPlan.monthlyPrice;
        if (isAnnual) amount = amount * 12 * 0.8;

        transactions.push({
            user: _user._id,
            amount: amount,
            currency: 'VND',
            planPurchased: selectedPlan.name,
            billingCycle: billingCycle,
            status: 'completed',
            paymentMethod: 'mock_vnpay',
            createdAt: createdAt,
            updatedAt: createdAt
        });
    }

    // Sort by date ascending
    transactions.sort((a, b) => a.createdAt - b.createdAt);

    await Transaction.insertMany(transactions);
    console.log(`Successfully seeded ${transactions.length} historical transactions.`);
    
    // Auto-update users to have active plans if recent transaction exists
    // (Simulate a realistic state)
    for (const tx of transactions.slice(-20)) { // Just grab a few recent ones
      const u = await User.findById(tx.user);
      if (u) {
         u.plan = tx.planPurchased;
         u.planStartedAt = tx.createdAt;
         const exp = new Date(tx.createdAt);
         if (tx.billingCycle === 'annual') exp.setFullYear(exp.getFullYear() + 1);
         else exp.setMonth(exp.getMonth() + 1);
         u.planExpiresAt = exp;
         await u.save();
      }
    }
    console.log('Synchronized recent transactions to User plan status.');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding transactions:', error);
    process.exit(1);
  }
}

generateFakeTransactions();
