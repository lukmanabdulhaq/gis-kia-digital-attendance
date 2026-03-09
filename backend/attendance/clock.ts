import { api, APIError, Header } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

const ALLOWED_CIDRS = [
  { base: [197, 210, 0, 0], prefix: 16 },
  { base: [41, 242, 0, 0], prefix: 16 },
  { base: [197, 255, 0, 0], prefix: 16 },
  { base: [127, 0, 0, 0], prefix: 8 },
  { base: [10, 0, 0, 0], prefix: 8 },
  { base: [172, 16, 0, 0], prefix: 12 },
  { base: [192, 168, 0, 0], prefix: 16 },
];

function ipToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isInCidr(ip: string, base: number[], prefix: number): boolean {
  try {
    const ipInt = ipToInt(ip);
    const baseInt = ((base[0] << 24) | (base[1] << 16) | (base[2] << 8) | base[3]) >>> 0;
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (ipInt & mask) === (baseInt & mask);
  } catch {
    return false;
  }
}

function isAllowedIp(ip: string): boolean {
  const cleanIp = ip.split(":").length > 4 ? "127.0.0.1" : ip.replace("::ffff:", "");
  return ALLOWED_CIDRS.some((cidr) => isInCidr(cleanIp, cidr.base, cidr.prefix));
}

interface ClockRequest {
  action: "in" | "out";
  latitude?: number;
  longitude?: number;
  clientIp?: Header<"X-Client-IP">;
  forwardedFor?: Header<"X-Forwarded-For">;
  realIp?: Header<"X-Real-IP">;
}

interface ClockResponse {
  id: number;
  action: string;
  time: Date;
  status: string;
  message: string;
  geofenceVerified: boolean;
  ipAddress: string;
}

const KIA_LAT = 5.6052;
const KIA_LNG = -0.1719;
const GEOFENCE_RADIUS_KM = 2.0;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Records a clock-in or clock-out action with IP geofencing and optional GPS verification.
export const clock = api<ClockRequest, ClockResponse>(
  { expose: true, method: "POST", path: "/attendance/clock", auth: true },
  async (req) => {
    const authData = getAuthData()!;
    const userId = parseInt(authData.userID);

    const rawIp =
      req.forwardedFor?.split(",")[0].trim() ??
      req.realIp ??
      req.clientIp ??
      "0.0.0.0";
    const clientIp = rawIp.replace("::ffff:", "");

    const ipAllowed = isAllowedIp(clientIp);

    let gpsAllowed = true;
    if (req.latitude !== undefined && req.longitude !== undefined) {
      const dist = haversineKm(req.latitude, req.longitude, KIA_LAT, KIA_LNG);
      gpsAllowed = dist <= GEOFENCE_RADIUS_KM;
    }

    const geofenceVerified = ipAllowed || gpsAllowed;

    if (!geofenceVerified) {
      throw APIError.permissionDenied(
        "Clock-in denied: You must be within the KIA Airport zone to clock in. " +
        `Your IP (${clientIp}) is not recognized as an authorized KIA network.`
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const existing = await db.queryRow<{
      id: number;
      clock_in: Date | null;
      clock_out: Date | null;
      status: string;
    }>`
      SELECT id, clock_in, clock_out, status
      FROM attendance WHERE user_id = ${userId} AND date = ${today}::date
    `;

    if (req.action === "in") {
      if (existing && existing.clock_in) {
        throw APIError.alreadyExists("Already clocked in today");
      }
      const now = new Date();
      const hour = now.getHours();
      let status = "present";
      const shift = authData.shift;
      if (shift === "morning" && hour >= 8) status = "late";
      else if (shift === "afternoon" && hour >= 14) status = "late";
      else if (shift === "night" && hour >= 22) status = "late";

      let record;
      if (existing) {
        record = await db.queryRow<{ id: number }>`
          UPDATE attendance SET clock_in = NOW(), status = ${status},
            ip_address = ${clientIp}, geofence_verified = ${geofenceVerified}
          WHERE id = ${existing.id} RETURNING id
        `;
      } else {
        record = await db.queryRow<{ id: number }>`
          INSERT INTO attendance (user_id, clock_in, date, status, ip_address, geofence_verified)
          VALUES (${userId}, NOW(), ${today}::date, ${status}, ${clientIp}, ${geofenceVerified}) RETURNING id
        `;
      }

      await db.exec`
        INSERT INTO system_logs (user_id, action, details, ip_address)
        VALUES (${userId}, 'clock_in', ${`Staff ${authData.staffId} clocked in - ${status} [IP: ${clientIp}]`}, ${clientIp})
      `;

      return {
        id: record!.id,
        action: "in",
        time: now,
        status,
        message: `Clocked IN at ${now.toLocaleTimeString("en-GH")} — Welcome ${authData.rank} ${authData.fullName}`,
        geofenceVerified,
        ipAddress: clientIp,
      };
    } else {
      if (!existing || !existing.clock_in) {
        throw APIError.failedPrecondition("Must clock in first");
      }
      if (existing.clock_out) {
        throw APIError.alreadyExists("Already clocked out today");
      }
      const now = new Date();
      await db.exec`UPDATE attendance SET clock_out = NOW() WHERE id = ${existing.id}`;
      await db.exec`
        INSERT INTO system_logs (user_id, action, details, ip_address)
        VALUES (${userId}, 'clock_out', ${`Staff ${authData.staffId} clocked out [IP: ${clientIp}]`}, ${clientIp})
      `;

      return {
        id: existing.id,
        action: "out",
        time: now,
        status: existing.status,
        message: `Clocked OUT at ${now.toLocaleTimeString("en-GH")} — Goodbye ${authData.rank} ${authData.fullName}`,
        geofenceVerified,
        ipAddress: clientIp,
      };
    }
  }
);
