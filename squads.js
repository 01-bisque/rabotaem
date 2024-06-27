const xlsx = require('xlsx');
const { addDays, format } = require('date-fns');

// Настраиваемые параметры
const START_DATE = '2024-07-27';
const DURATION_DAYS = 62; // 2 месяца
const ACCOUNTS_COUNT = 5;
const MIN_AMOUNT = 60;
const MAX_AMOUNT = 1000;
const AMOUNT_STEP = 10;
const MAX_OPERATIONS_PER_DAY = 2;
const COMMISSION_RATE = 0.002; // 0.2%
const MIN_COMMISSION = 50;
const MAX_COMMISSION = 60;
const OUTPUT_FILENAME = 'trading_schedule.xlsx';
const MAX_ATTEMPTS = 1000; // Максимальное количество попыток генерации

function generateRandomAmount() {
    const range = (MAX_AMOUNT - MIN_AMOUNT) / AMOUNT_STEP;
    return (Math.floor(Math.random() * (range + 1)) * AMOUNT_STEP) + MIN_AMOUNT;
}

function generateDailyOperations() {
    const operationsCount = Math.floor(Math.random() * (MAX_OPERATIONS_PER_DAY + 1));
    return Array(operationsCount).fill().map(() => generateRandomAmount());
}

function generateSchedule(startDate, durationDays, accountsCount) {
    const schedule = {};
    let currentDate = new Date(startDate);

    for (let day = 0; day < durationDays; day++) {
        const dateString = format(currentDate, 'dd.MM.yyyy');
        schedule[dateString] = {};

        for (let account = 1; account <= accountsCount; account++) {
            schedule[dateString][`Аккаунт ${account}`] = generateDailyOperations();
        }

        currentDate = addDays(currentDate, 1);
    }

    return schedule;
}

function calculateTotalAndCommission(schedule) {
    const totals = {};
    for (const date in schedule) {
        for (const account in schedule[date]) {
            if (!totals[account]) totals[account] = 0;
            totals[account] += schedule[date][account].reduce((sum, amount) => sum + amount, 0);
        }
    }

    const commissions = {};
    for (const account in totals) {
        commissions[account] = totals[account] * COMMISSION_RATE;
    }

    return { totals, commissions };
}

function isCommissionInRange(commissions) {
    return Object.values(commissions).every(commission => 
        commission >= MIN_COMMISSION && commission <= MAX_COMMISSION
    );
}

function saveToExcel(schedule, filename) {
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(
        Object.entries(schedule).map(([date, accounts]) => ({
            Дата: date,
            ...Object.fromEntries(Object.entries(accounts).map(([account, operations]) => 
                [account, operations.join(', ') || '-']
            ))
        }))
    );
    xlsx.utils.book_append_sheet(wb, ws, "График операций");
    xlsx.writeFile(wb, filename);
}

// Генерация графика
let schedule;
let totals;
let commissions;
let attempts = 0;

do {
    schedule = generateSchedule(START_DATE, DURATION_DAYS, ACCOUNTS_COUNT);
    ({ totals, commissions } = calculateTotalAndCommission(schedule));
    attempts++;

    if (attempts >= MAX_ATTEMPTS) {
        console.log(`Не удалось сгенерировать подходящее расписание за ${MAX_ATTEMPTS} попыток.`);
        process.exit(1);
    }
} while (!isCommissionInRange(commissions));

// Вывод результатов
for (const account in totals) {
    console.log(`${account}: Всего ${totals[account]} фишек, комиссия ${commissions[account].toFixed(2)} фишек`);
}

// Сохранение в Excel
saveToExcel(schedule, OUTPUT_FILENAME);

console.log(`График сохранен в файл ${OUTPUT_FILENAME}`);
console.log(`Расписание сгенерировано за ${attempts} попыток.`);
