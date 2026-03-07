CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  staff_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'officer',
  rank TEXT NOT NULL DEFAULT 'Officer',
  shift TEXT NOT NULL DEFAULT 'morning',
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE system_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO users (email, staff_id, full_name, role, rank, shift, pin_hash) VALUES
('bismark.dzah@gis.gov.gh', 'GIS12345', 'Bismark Gabriel Dzah', 'admin', 'Chief Inspector', 'morning', '123456'),
('john.mensah@gis.gov.gh', 'GIS12346', 'John Kwame Mensah', 'supervisor', 'Inspector', 'morning', '123456'),
('abena.asante@gis.gov.gh', 'GIS12347', 'Abena Asante', 'officer', 'Officer', 'morning', '123456'),
('kweku.boateng@gis.gov.gh', 'GIS12348', 'Kweku Boateng', 'officer', 'Officer', 'afternoon', '123456'),
('ama.adjei@gis.gov.gh', 'GIS12349', 'Ama Adjei', 'officer', 'Officer', 'morning', '123456'),
('kofi.owusu@gis.gov.gh', 'GIS12350', 'Kofi Owusu', 'officer', 'Senior Officer', 'night', '123456'),
('akosua.darko@gis.gov.gh', 'GIS12351', 'Akosua Darko', 'officer', 'Officer', 'afternoon', '123456'),
('yaw.amponsah@gis.gov.gh', 'GIS12352', 'Yaw Amponsah', 'officer', 'Officer', 'morning', '123456'),
('efua.nyarko@gis.gov.gh', 'GIS12353', 'Efua Nyarko', 'officer', 'Officer', 'night', '123456'),
('kwame.tetteh@gis.gov.gh', 'GIS12354', 'Kwame Tetteh', 'supervisor', 'Senior Inspector', 'afternoon', '123456');

INSERT INTO attendance (user_id, clock_in, clock_out, date, status) VALUES
(3, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 minutes', CURRENT_DATE, 'present'),
(4, NOW() - INTERVAL '1 hour', NULL, CURRENT_DATE, 'late'),
(5, NOW() - INTERVAL '3 hours', NULL, CURRENT_DATE, 'present'),
(7, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '1 hour', CURRENT_DATE, 'present'),
(3, NOW() - INTERVAL '1 day' - INTERVAL '8 hours', NOW() - INTERVAL '1 day', CURRENT_DATE - 1, 'present'),
(4, NOW() - INTERVAL '1 day' - INTERVAL '9 hours', NOW() - INTERVAL '1 day' + INTERVAL '1 hour', CURRENT_DATE - 1, 'present'),
(5, NOW() - INTERVAL '1 day' - INTERVAL '7 hours', NOW() - INTERVAL '1 day' + INTERVAL '30 minutes', CURRENT_DATE - 1, 'late'),
(6, NOW() - INTERVAL '2 days' - INTERVAL '8 hours', NOW() - INTERVAL '2 days', CURRENT_DATE - 2, 'present'),
(8, NOW() - INTERVAL '2 days' - INTERVAL '9 hours', NOW() - INTERVAL '2 days' + INTERVAL '2 hours', CURRENT_DATE - 2, 'present'),
(9, NOW() - INTERVAL '3 days' - INTERVAL '8 hours', NOW() - INTERVAL '3 days', CURRENT_DATE - 3, 'present');
