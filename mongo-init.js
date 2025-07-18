// mongo-init.js
// This runs once, on first init
db = db.getSiblingDB('runbook');
db.createUser({
    user: 'runbook',
    pwd: 'secret',
    roles: [{ role: 'readWrite', db: 'runbook' }]
});
