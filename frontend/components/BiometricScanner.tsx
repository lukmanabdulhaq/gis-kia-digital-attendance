import React, { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import backend from "~backend/client";

interface LoginSuccessPayload {
  token: string;
  refreshToken: string;
  user: {
    id: number;
    staffId: string;
    fullName: string;
    role: string;
    rank: string;
    shift: string;
    email: string;
  };
}

interface BiometricScannerProps {
  staffId: string;
  onLoginSuccess: (payload: LoginSuccessPayload) => void;
  disabled?: boolean;
}

function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function arrayBufferToBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function BiometricScanner({ staffId, onLoginSuccess, disabled }: BiometricScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const { toast } = useToast();

  const isWebAuthnSupported = typeof window !== "undefined" && !!window.PublicKeyCredential;

  const handleScan = async () => {
    if (disabled || scanning) return;

    if (!isWebAuthnSupported) {
      toast({
        title: "Biometrics Not Supported",
        description: "Your device/browser does not support WebAuthn. Please use PIN login.",
        variant: "destructive",
      });
      return;
    }

    if (!staffId.trim()) {
      toast({
        title: "Enter Staff ID First",
        description: "Please enter your Staff ID before using biometric login.",
        variant: "destructive",
      });
      return;
    }

    setScanning(true);
    setScanned(false);

    try {
      const startResp = await backend.auth.webauthnAuthStart({ staffId: staffId.trim().toUpperCase() });

      const challengeBuf = base64urlToArrayBuffer(startResp.challenge);

      const allowCredentials: PublicKeyCredentialDescriptor[] = startResp.allowCredentials.map((c) => ({
        type: "public-key" as const,
        id: base64urlToArrayBuffer(c.id),
      }));

      const assertionOptions: PublicKeyCredentialRequestOptions = {
        challenge: challengeBuf,
        rpId: startResp.rpId,
        timeout: startResp.timeout,
        userVerification: (startResp.userVerification ?? "preferred") as UserVerificationRequirement,
        allowCredentials,
      };

      const credential = await navigator.credentials.get({ publicKey: assertionOptions }) as PublicKeyCredential | null;
      if (!credential) throw new Error("No credential returned");

      const response = credential.response as AuthenticatorAssertionResponse;

      const finishResp = await backend.auth.webauthnAuthFinish({
        staffId: staffId.trim().toUpperCase(),
        credentialId: arrayBufferToBase64url(credential.rawId),
        clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
        authenticatorData: arrayBufferToBase64url(response.authenticatorData),
        signature: arrayBufferToBase64url(response.signature),
      });

      setScanned(true);
      onLoginSuccess(finishResp);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Biometric authentication failed";
      if (msg.includes("No biometric credentials registered")) {
        toast({
          title: "Not Registered",
          description: "No biometric credentials found. Login with PIN first, then register your biometrics.",
          variant: "destructive",
        });
      } else if ((err as DOMException)?.name === "NotAllowedError") {
        toast({
          title: "Biometric Cancelled",
          description: "Authentication was cancelled or timed out. Please use PIN login.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Biometric Failed",
          description: msg,
          variant: "destructive",
        });
      }
    } finally {
      setScanning(false);
    }
  };

  return (
    <button
      onClick={handleScan}
      disabled={disabled || scanning || !isWebAuthnSupported}
      className="flex flex-col items-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
      type="button"
      title={!isWebAuthnSupported ? "Biometrics not supported on this device" : "Scan fingerprint / face to login"}
    >
      <div className="relative">
        {scanning && (
          <>
            <div className="absolute inset-0 rounded-full border-4 border-[#006400] animate-ping opacity-40" />
            <div className="absolute inset-[-8px] rounded-full border-2 border-[#FFD700] animate-ping opacity-20" style={{ animationDelay: "0.3s" }} />
          </>
        )}
        <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
          scanned
            ? "bg-[#006400] shadow-lg shadow-[#006400]/40"
            : scanning
            ? "bg-[#006400]/20 border-2 border-[#006400]"
            : "bg-muted border-2 border-muted-foreground/30 group-hover:border-[#006400] group-hover:bg-[#006400]/10"
        }`}>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 4C12.06 4 4 12.06 4 22" stroke={scanned ? "white" : "#006400"} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M22 8C14.27 8 8 14.27 8 22" stroke={scanned ? "white" : "#006400"} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
            <path d="M22 12C16.48 12 12 16.48 12 22" stroke={scanned ? "white" : "#006400"} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
            <path d="M22 16C18.69 16 16 18.69 16 22" stroke={scanned ? "white" : "#006400"} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
            <path d="M22 20C20.9 20 20 20.9 20 22" stroke={scanned ? "white" : "#006400"} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
            <path d="M40 22C40 31.94 31.94 40 22 40" stroke={scanned ? "white" : "#FFD700"} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M36 22C36 29.73 29.73 36 22 36" stroke={scanned ? "white" : "#FFD700"} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
            <path d="M32 22C32 27.52 27.52 32 22 32" stroke={scanned ? "white" : "#FFD700"} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
            <path d="M28 22C28 25.31 25.31 28 22 28" stroke={scanned ? "white" : "#FFD700"} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
            <path d="M24 22C24 23.1 23.1 24 22 24" stroke={scanned ? "white" : "#FFD700"} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
          </svg>
        </div>
      </div>
      <span className={`text-sm font-medium transition-colors ${
        scanned ? "text-[#006400]"
        : !isWebAuthnSupported ? "text-muted-foreground/50"
        : "text-muted-foreground group-hover:text-[#006400]"
      }`}>
        {!isWebAuthnSupported
          ? "Biometrics unavailable"
          : scanned
          ? "✓ Verified"
          : scanning
          ? "Scanning…"
          : "Scan Fingerprint"}
      </span>
    </button>
  );
}

interface BiometricRegisterProps {
  token: string;
  staffId: string;
  onSuccess?: () => void;
}

export function BiometricRegister({ token, staffId, onSuccess }: BiometricRegisterProps) {
  const [registering, setRegistering] = useState(false);
  const { toast } = useToast();

  const isWebAuthnSupported = typeof window !== "undefined" && !!window.PublicKeyCredential;

  const handleRegister = async () => {
    if (!isWebAuthnSupported) {
      toast({ title: "Not Supported", description: "WebAuthn not available on this device.", variant: "destructive" });
      return;
    }
    setRegistering(true);
    try {
      const client = backend.with({ auth: async () => ({ authorization: `Bearer ${token}` }) });
      const startResp = await client.auth.webauthnRegisterStart();

      const challengeBuf = base64urlToArrayBuffer(startResp.challenge);
      const userIdBuf = new TextEncoder().encode(startResp.userId);

      const creationOptions: PublicKeyCredentialCreationOptions = {
        challenge: challengeBuf,
        rp: { id: startResp.rpId, name: startResp.rpName },
        user: {
          id: userIdBuf,
          name: startResp.userName,
          displayName: startResp.userDisplayName,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        timeout: startResp.timeout,
        attestation: "none",
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          requireResidentKey: false,
          userVerification: "preferred",
        },
      };

      const credential = await navigator.credentials.create({ publicKey: creationOptions }) as PublicKeyCredential | null;
      if (!credential) throw new Error("No credential created");

      const response = credential.response as AuthenticatorAttestationResponse;
      const rawPublicKey = response.getPublicKey?.() ?? null;

      await client.auth.webauthnRegisterFinish({
        credentialId: arrayBufferToBase64url(credential.rawId),
        clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
        attestationObject: arrayBufferToBase64url(response.attestationObject),
        publicKey: rawPublicKey ? arrayBufferToBase64url(rawPublicKey) : "",
      });

      toast({ title: "Biometric Registered!", description: "Your fingerprint/face has been registered for future logins." });
      onSuccess?.();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Registration failed";
      toast({ title: "Registration Failed", description: msg, variant: "destructive" });
    } finally {
      setRegistering(false);
    }
  };

  if (!isWebAuthnSupported) return null;

  return (
    <button
      onClick={handleRegister}
      disabled={registering}
      className="flex items-center gap-2 text-sm text-[#006400] hover:underline disabled:opacity-50"
      type="button"
    >
      {registering ? "Registering…" : "Register Biometrics"}
    </button>
  );
}
