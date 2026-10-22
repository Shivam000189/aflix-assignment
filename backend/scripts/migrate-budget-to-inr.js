require('dotenv').config();
const { prisma } = require('../config/db');

function convertBudgetToInr(budgetStr) {
    if (!budgetStr) return '₹1,00,000 - ₹5,00,000';
    const trimmed = String(budgetStr).trim();
    if (trimmed.includes('₹') || trimmed.toUpperCase().includes('INR')) {
        return trimmed;
    }

    if (trimmed === '$25,000 - $50,000') return '₹25,00,000 - ₹50,00,000';
    if (trimmed === '$10,000 - $25,000') return '₹10,00,000 - ₹25,00,000';
    if (trimmed === '$15,000 - $30,000') return '₹15,00,000 - ₹30,00,000';
    if (trimmed === '$50,000+') return '₹50,00,000+';
    if (trimmed === '$1,000 - $5,000') return '₹1,00,000 - ₹5,00,000';
    if (trimmed === '$5,000 - $10,000') return '₹5,00,000 - ₹10,00,000';
    if (trimmed === '$15k - $50k') return '₹5,00,000 - ₹15,00,000';
    if (trimmed === '$50k - $100k') return '₹15,00,000 - ₹50,00,000';
    if (trimmed === '$100k+') return '₹50,00,000+';
    if (trimmed === '$1k - $5k') return '₹50,000 - ₹1,50,000';
    if (trimmed === '$5k - $15k') return '₹1,50,000 - ₹5,00,000';

    return trimmed.replace(/\$/g, '₹');
}

async function run() {
    console.log('Starting migration: converting budgets from USD ($) to INR (₹)...');
    
    const leads = await prisma.lead.findMany();
    let updatedCount = 0;

    for (const lead of leads) {
        const newBudget = convertBudgetToInr(lead.budget);
        let newNotes = lead.notes;
        if (newNotes) {
            newNotes = newNotes
                .replace(/\$45k/g, '₹35,00,000')
                .replace(/\$65,000/g, '₹55,00,000')
                .replace(/\$25k/g, '₹20,00,000')
                .replace(/\$/g, '₹');
        }

        if (newBudget !== lead.budget || newNotes !== lead.notes) {
            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    budget: newBudget,
                    notes: newNotes
                }
            });
            console.log(`Updated lead "${lead.name}": budget was "${lead.budget}" -> now "${newBudget}"`);
            updatedCount++;
        }
    }

    // Update activity logs
    const activities = await prisma.activityLog.findMany();
    let activityCount = 0;
    for (const act of activities) {
        if (act.description && act.description.includes('$')) {
            const newDesc = act.description
                .replace(/\$65,000/g, '₹55,00,000')
                .replace(/\$25k/g, '₹20,00,000')
                .replace(/\$/g, '₹');
            await prisma.activityLog.update({
                where: { id: act.id },
                data: { description: newDesc }
            });
            activityCount++;
        }
    }

    console.log(`Migration complete! Updated ${updatedCount} leads and ${activityCount} activity logs.`);
}

run()
    .catch((err) => {
        console.error('Migration failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
