const {
  calculateScheduledTimestamps,
  calculateScheduledTimestampsInSeconds,
  calculateScheduleDetails,
} = require('./dist/src/utils/schedule-calculator');

async function runTest() {
  console.log('=== TESTING PURE TYPESCRIPT SCHEDULE CALCULATOR UTILITY ===\n');

  const startDate = new Date('2026-08-01T08:30:00.000Z');

  // 1. Test every_5_days rule
  console.log('1. Testing frequencyRule: "every_5_days"...');
  const timestamps5 = calculateScheduledTimestamps(startDate, 'every_5_days');
  const details5 = calculateScheduleDetails({ startDate, frequencyRule: 'every_5_days' });

  console.log('   ✅ Return array length:', timestamps5.length, '(Expected: 10)');
  console.log('   ✅ First 3 Unix Timestamps (Ms):', timestamps5.slice(0, 3));
  console.log('   ✅ First 3 Formatted Local Dates:');
  details5.formattedDates.slice(0, 3).forEach((d, idx) => console.log(`      [${idx + 1}] ${d}`));

  if (timestamps5.length !== 10) throw new Error('Expected exactly 10 timestamps for every_5_days');

  // Verify all timestamps correspond to 10:00:00 AM local time
  details5.timestampsMs.forEach((ts, idx) => {
    const d = new Date(ts);
    if (d.getHours() !== 10 || d.getMinutes() !== 0 || d.getSeconds() !== 0) {
      throw new Error(`Timestamp #${idx + 1} is not set to 10:00:00 AM local time! Got: ${d.toTimeString()}`);
    }
  });
  console.log('   ✅ ALL 10 Timestamps strictly set to 10:00:00.000 AM local time!');

  // Verify 5-day intervals
  const diffDays5 = (timestamps5[1] - timestamps5[0]) / (1000 * 60 * 60 * 24);
  console.log('   ✅ Interval between post 1 and post 2:', diffDays5, 'days (Expected: 5)');
  if (Math.round(diffDays5) !== 5) throw new Error('Interval is not 5 days');

  // 2. Test alternate_days rule
  console.log('\n2. Testing frequencyRule: "alternate_days"...');
  const timestampsAlt = calculateScheduledTimestamps(startDate, 'alternate_days');
  const detailsAlt = calculateScheduleDetails({ startDate, frequencyRule: 'alternate_days' });

  console.log('   ✅ Return array length:', timestampsAlt.length, '(Expected: 10)');
  console.log('   ✅ First 3 Formatted Local Dates:');
  detailsAlt.formattedDates.slice(0, 3).forEach((d, idx) => console.log(`      [${idx + 1}] ${d}`));

  if (timestampsAlt.length !== 10) throw new Error('Expected exactly 10 timestamps for alternate_days');

  const diffDaysAlt = (timestampsAlt[1] - timestampsAlt[0]) / (1000 * 60 * 60 * 24);
  console.log('   ✅ Interval between post 1 and post 2:', diffDaysAlt, 'days (Expected: 2)');
  if (Math.round(diffDaysAlt) !== 2) throw new Error('Interval is not 2 days');

  // 3. Test seconds output
  console.log('\n3. Testing Unix Timestamps in Seconds...');
  const timestampsSec = calculateScheduledTimestampsInSeconds(startDate, 'every_5_days');
  console.log('   ✅ First Unix Timestamp (Sec):', timestampsSec[0], '(Digit count:', String(timestampsSec[0]).length, ')');

  if (String(timestampsSec[0]).length !== 10) {
    throw new Error('Unix timestamp in seconds must be 10 digits long');
  }

  console.log('\n🎉 ALL SCHEDULE CALCULATOR UTILITY TESTS PASSED SUCCESSFULLY!');
}

runTest().catch((err) => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
