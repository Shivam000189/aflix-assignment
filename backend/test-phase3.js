/**
 * Aflix Infotech CRM - Phase 3 Verification Suite
 * Tests:
 * 1. Timezone-safe date normalization and overdue calculations (all 6 edge cases)
 * 2. ActivityPage event category filtering and unknown type resilience
 * 3. Express server routing: /api/* JSON 404 guard, health check, and SPA static distribution serving
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('====================================================');
console.log('Phase 3 Verification: Date Handling, Activity Types, & Static Serving');
console.log('====================================================\n');

// -------------------------------------------------------------
// Test 1: Timezone-Safe Date Handling Logic
// -------------------------------------------------------------
console.log('--- Test 1: Timezone-Safe Date Handling Logic ---');

function getLocalTodayDateString(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDateString(dateInput) {
  if (!dateInput && dateInput !== 0) return '';

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return '';

    const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      const day = match[3].padStart(2, '0');
      const mNum = parseInt(month, 10);
      const dNum = parseInt(day, 10);
      if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
        return `${year}-${month}-${day}`;
      }
    }

    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) return '';
    return getLocalTodayDateString(parsed);
  }

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '';
    return getLocalTodayDateString(dateInput);
  }

  if (typeof dateInput === 'number') {
    const parsed = new Date(dateInput);
    if (isNaN(parsed.getTime())) return '';
    return getLocalTodayDateString(parsed);
  }

  return '';
}

function isOverdue(dueDateInput, isCompleted = false, referenceDate = new Date()) {
  if (isCompleted) return false;
  const dateOnly = normalizeDateString(dueDateInput);
  if (!dateOnly) return false;

  const today = getLocalTodayDateString(referenceDate);
  return dateOnly < today;
}

function isDueToday(dueDateInput, referenceDate = new Date()) {
  const dateOnly = normalizeDateString(dueDateInput);
  if (!dateOnly) return false;

  const today = getLocalTodayDateString(referenceDate);
  return dateOnly === today;
}

// Reference date: October 23, 2026, 12:00:00 Local
const refToday = new Date(2026, 9, 23, 12, 0, 0); // Month index 9 = October
const todayStr = getLocalTodayDateString(refToday);
assert.strictEqual(todayStr, '2026-10-23', 'Local date formatting should match 2026-10-23');

// Case 1: Incomplete task with a due date in the past
const pastTaskDue = '2026-10-22';
assert.strictEqual(isOverdue(pastTaskDue, false, refToday), true, 'Past due date should be overdue');
assert.strictEqual(isDueToday(pastTaskDue, refToday), false, 'Past due date is not due today');
console.log('✓ Case 1 Passed: Incomplete task with due date in the past is overdue');

// Case 2: Incomplete task due today
const todayTaskDue = '2026-10-23';
assert.strictEqual(isOverdue(todayTaskDue, false, refToday), false, 'Today due date should NOT be overdue');
assert.strictEqual(isDueToday(todayTaskDue, refToday), true, 'Today due date is due today');
console.log('✓ Case 2 Passed: Incomplete task due today is NOT overdue and marked due today');

// Case 3: Incomplete task due tomorrow
const tomorrowTaskDue = '2026-10-24';
assert.strictEqual(isOverdue(tomorrowTaskDue, false, refToday), false, 'Tomorrow due date should NOT be overdue');
assert.strictEqual(isDueToday(tomorrowTaskDue, refToday), false, 'Tomorrow due date is NOT due today');
console.log('✓ Case 3 Passed: Incomplete task due tomorrow is NOT overdue');

// Case 4: Completed task whose due date is in the past
assert.strictEqual(isOverdue(pastTaskDue, true, refToday), false, 'Completed task in the past must NEVER be overdue');
console.log('✓ Case 4 Passed: Completed task with past due date is NEVER overdue');

// Case 5: Dates near local midnight and UTC date boundaries
// Scenario: In UTC+5:30 (e.g. IST), at 00:15 AM on Oct 23rd, UTC time is 18:45 PM on Oct 22nd.
// The old code: new Date().toISOString().split('T')[0] returned '2026-10-22' (wrong!).
// Our code: getLocalTodayDateString() uses local calendar year/month/date and correctly returns '2026-10-23'.
const nearMidnightLocal = new Date(2026, 9, 23, 0, 15, 0); // 00:15 AM
assert.strictEqual(getLocalTodayDateString(nearMidnightLocal), '2026-10-23', 'Local midnight must evaluate to 2026-10-23');
assert.strictEqual(isOverdue('2026-10-22', false, nearMidnightLocal), true, 'At 00:15 AM on Oct 23, Oct 22 task is overdue');
assert.strictEqual(isOverdue('2026-10-23', false, nearMidnightLocal), false, 'At 00:15 AM on Oct 23, Oct 23 task is NOT overdue');

// Scenario: ISO strings stored in DB with UTC timestamps like "2026-10-23T00:00:00.000Z"
assert.strictEqual(normalizeDateString('2026-10-23T00:00:00.000Z'), '2026-10-23', 'ISO timestamp extracted to 2026-10-23');
assert.strictEqual(isOverdue('2026-10-23T00:00:00.000Z', false, refToday), false, 'DB UTC midnight task due today is NOT overdue');
console.log('✓ Case 5 Passed: Local midnight and UTC boundary dates evaluate correctly');

// Case 6: Invalid or missing date values
assert.strictEqual(isOverdue('', false, refToday), false, 'Empty string is not overdue');
assert.strictEqual(isOverdue(null, false, refToday), false, 'Null date is not overdue');
assert.strictEqual(isOverdue(undefined, false, refToday), false, 'Undefined date is not overdue');
assert.strictEqual(isOverdue('invalid-date', false, refToday), false, 'Invalid string is not overdue');
assert.strictEqual(isDueToday('invalid-date', refToday), false, 'Invalid string is not due today');
console.log('✓ Case 6 Passed: Invalid/missing date values safely return false\n');

// -------------------------------------------------------------
// Test 2: Activity Filtering and Unknown Event Resilience
// -------------------------------------------------------------
console.log('--- Test 2: Activity Filtering & Category Mapping ---');

function filterActivities(activities, filterType) {
  return activities.filter((act) => {
    if (filterType === 'All') return true;
    if (filterType === 'status') {
      return act.type === 'status_change' || act.type === 'status_changed';
    }
    if (filterType === 'followup') {
      return (
        act.type === 'task_added' ||
        act.type === 'task_completed' ||
        act.type === 'task_updated' ||
        act.type === 'task_deleted' ||
        act.type === 'task_reopened' ||
        act.type === 'followup_added' ||
        act.type === 'followup_completed'
      );
    }
    if (filterType === 'field_update') {
      return (
        act.type === 'field_update' ||
        act.type === 'priority_change' ||
        act.type === 'owner_change'
      );
    }
    if (filterType === 'lead') {
      return (
        act.type === 'created' ||
        act.type === 'lead_created' ||
        act.type === 'lead_updated' ||
        act.type === 'field_update' ||
        act.type === 'priority_change' ||
        act.type === 'owner_change' ||
        act.type === 'archived' ||
        act.type === 'lead_archived' ||
        act.type === 'restored' ||
        act.type === 'lead_unarchived' ||
        act.type === 'note_added'
      );
    }
    return true;
  });
}

const sampleActivities = [
  { id: '1', type: 'status_change', description: 'Moved to Qualified' },
  { id: '2', type: 'task_added', description: 'Follow-up call scheduled' },
  { id: '3', type: 'task_completed', description: 'Follow-up call completed' },
  { id: '4', type: 'field_update', description: 'Company updated to Aflix Tech' },
  { id: '5', type: 'priority_change', description: 'Priority changed to High' },
  { id: '6', type: 'owner_change', description: 'Reassigned to Sarah' },
  { id: '7', type: 'created', description: 'Lead created' },
  { id: '8', type: 'note_added', description: 'Customer requested invoice' },
  { id: '9', type: 'custom_integration_event', description: 'Third-party webhook synced' } // Unknown event
];

// All filter
const allResults = filterActivities(sampleActivities, 'All');
assert.strictEqual(allResults.length, 9, 'All filter should return all 9 events including unknown events');
console.log('✓ "All" filter includes all 9 events (including unknown custom event)');

// Status filter
const statusResults = filterActivities(sampleActivities, 'status');
assert.strictEqual(statusResults.length, 1);
assert.strictEqual(statusResults[0].type, 'status_change');
console.log('✓ "status" filter matches canonical status_change');

// Followup filter
const followupResults = filterActivities(sampleActivities, 'followup');
assert.strictEqual(followupResults.length, 2);
assert.deepStrictEqual(followupResults.map(a => a.type), ['task_added', 'task_completed']);
console.log('✓ "followup" filter matches task_added and task_completed');

// Field update filter
const fieldUpdateResults = filterActivities(sampleActivities, 'field_update');
assert.strictEqual(fieldUpdateResults.length, 3);
assert.deepStrictEqual(fieldUpdateResults.map(a => a.type), ['field_update', 'priority_change', 'owner_change']);
console.log('✓ "field_update" filter matches field_update, priority_change, and owner_change');

// Lead filter
const leadResults = filterActivities(sampleActivities, 'lead');
assert.strictEqual(leadResults.length, 5); // created, field_update, priority_change, owner_change, note_added
console.log('✓ "lead" filter matches lead lifecycle and modification events');

// Empty category test
const emptyResults = filterActivities([], 'status');
assert.strictEqual(emptyResults.length, 0);
console.log('✓ Empty states safely return empty array\n');

// -------------------------------------------------------------
// Test 3: Express Server Routing & Static Asset Configuration
// -------------------------------------------------------------
console.log('--- Test 3: Express Static Distribution & API 404 Guard ---');

const express = require('express');
const http = require('http');

// Spin up a test Express instance with identical routing setup
const testApp = express();
testApp.use(express.json());

// 1. Health check
testApp.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Dummy leads API
testApp.get('/api/leads', (req, res) => {
  res.json({ success: true, leads: [] });
});

// 3. API 404 Guard (Express 5 compatible)
testApp.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.method} ${req.originalUrl}' not found`
  });
});

// 4. Static files and SPA fallback
const distPath = path.resolve(__dirname, '../frotend/dist');
assert.strictEqual(fs.existsSync(distPath), true, 'frotend/dist must exist');
testApp.use(express.static(distPath));

testApp.use((req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ success: false, message: 'Not found' });
  }
});

const testServer = http.createServer(testApp);

function makeRequest(pathName) {
  return new Promise((resolve, reject) => {
    const port = testServer.address().port;
    const req = http.get(`http://127.0.0.1:${port}${pathName}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', reject);
  });
}

testServer.listen(0, '127.0.0.1', async () => {
  try {
    // 3.1: Valid API route returns JSON 200
    const healthRes = await makeRequest('/api/health');
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthRes.headers['content-type'].includes('application/json'), true);
    const healthJson = JSON.parse(healthRes.body);
    assert.strictEqual(healthJson.status, 'ok');
    console.log('✓ Valid API route (/api/health) returns HTTP 200 JSON');

    // 3.2: Unknown API route returns JSON 404 (NEVER index.html)
    const unknownApiRes = await makeRequest('/api/nonexistent-endpoint');
    assert.strictEqual(unknownApiRes.status, 404);
    assert.strictEqual(unknownApiRes.headers['content-type'].includes('application/json'), true);
    const unknownJson = JSON.parse(unknownApiRes.body);
    assert.strictEqual(unknownJson.success, false);
    assert.strictEqual(unknownJson.message.includes('not found'), true);
    console.log('✓ Unknown API route (/api/nonexistent-endpoint) returns HTTP 404 JSON, NOT index.html');

    // 3.3: Direct navigation to client-side SPA route returns index.html
    const spaRouteRes = await makeRequest('/activities');
    assert.strictEqual(spaRouteRes.status, 200);
    assert.strictEqual(spaRouteRes.headers['content-type'].includes('text/html'), true);
    assert.strictEqual(spaRouteRes.body.includes('<div id="root"></div>') || spaRouteRes.body.includes('<!doctype html>'), true);
    console.log('✓ Direct navigation to client-side route (/activities) returns index.html');

    // 3.4: Static asset request returns 200 with appropriate asset type
    const faviconRes = await makeRequest('/favicon.svg');
    assert.strictEqual(faviconRes.status, 200);
    console.log('✓ Static asset (/favicon.svg) successfully served from distribution directory');

    console.log('\n====================================================');
    console.log('ALL PHASE 3 VERIFICATION TESTS PASSED SUCCESSFULLY');
    console.log('====================================================');
  } catch (err) {
    console.error('Test assertion failed:', err);
    process.exit(1);
  } finally {
    testServer.close();
  }
});
