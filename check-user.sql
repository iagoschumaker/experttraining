SELECT id, name, email, is_active, is_superadmin 
FROM users 
WHERE email LIKE '%juba%' OR email LIKE '%expert%';
