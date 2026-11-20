"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { loadIdentity, saveIdentity } from "@/lib/identity";
import type {
  ChatMessage,
  CheerEvent,
  DonationEvent,
  Identity,
  PublicUser,
  RoomSnapshot,
  RoomSummary,
  UserRole,
} from "@/lib/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";

// STUN works for most home networks. Add a TURN server (NEXT_PUBLIC_TURN_*)
// so video also connects through strict NATs, corporate Wi-Fi and mobile data.
const TURN_URL = process.env.NEXT_PUBLIC_TURN_URL;
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    ...(TURN_URL
      ? [
          {
            urls: TURN_URL.split(",").map((u) => u.trim()),
            username: process.env.NEXT_PUBLIC_TURN_USERNAME,
            credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
          },
        ]
      : []),
  ],
};

type SignalPayload = {
  type: "offer" | "answer" | "candidate" | "bye";
  sdp?: string;
  candidate?: RTCIceCandidateInit;
};

type SocketContextValue = {
  connected: boolean;
  identity: Identity;
  role: UserRole | null;
  room: RoomSnapshot | null;
  you: PublicUser | null;
  error: string | null;
  notice: string | null;
  messages: ChatMessage[];
  cheers: CheerEvent[];
  donations: DonationEvent[];
  rooms: RoomSummary[];
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  muted: boolean;
  videoOff: boolean;
  listRooms: () => void;
  makeAdmin: (userId: string) => void;
  setIdentity: (patch: Partial<Identity>) => void;
  createRoom: (input: {
    roomName: string;
    roomCategory: string;
    performerDuration: number;
  }) => Promise<void>;
  joinRoom: (input: { roomCode: string; role: UserRole }) => Promise<void>;
  leaveRoom: () => void;
  closeRoom: () => void;
  sendChat: (text: string) => void;
  vote: (score: number) => void;
  cheer: (message: string) => void;
  donate: (amount: number, message: string) => void;
  adminScore: (score: number) => void;
  joinQueue: () => void;
  leaveQueue: () => void;
  startPerformance: (performerId?: string) => void;
  endPerformance: () => void;
  updateProfile: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  clearError: () => void;
  clearNotice: () => void;
};

const SocketContext = createContext<SocketContextValue | null>(null);

function emptyRoom(): RoomSnapshot | null {
  return null;
}

function toChatMessage(data: Record<string, any>, myId: string): ChatMessage {
  const seconds: number = data.timestamp || Math.floor(Date.now() / 1000);
  return {
    id: data.id || `${seconds}-${data.userId}-${Math.random().toString(36).slice(2, 8)}`,
    name: data.username,
    userId: data.userId,
    time: new Date(seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    text: data.message,
    isUser: data.userId === myId,
    role: data.role,
    profilePic: data.profilePic || undefined,
  };
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [identity, setIdentityState] = useState<Identity>(() =>
    typeof window === "undefined"
      ? { userId: "", secret: "", username: "", socialLinks: {} }
      : loadIdentity()
  );
  const [role, setRole] = useState<UserRole | null>(null);
  const [room, setRoom] = useState<RoomSnapshot | null>(emptyRoom);
  const [you, setYou] = useState<PublicUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cheers, setCheers] = useState<CheerEvent[]>([]);
  const [donations, setDonations] = useState<DonationEvent[]>([]);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const pendingRef = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const roleRef = useRef<UserRole | null>(null);
  const roomRef = useRef<RoomSnapshot | null>(null);
  const identityRef = useRef(identity);
  const myIdRef = useRef(identity.userId);
  const joinRoomRef = useRef<((input: { roomCode: string; role: UserRole }) => Promise<void>) | null>(null);

  useEffect(() => {
    const loaded = loadIdentity();
    setIdentityState(loaded);
    identityRef.current = loaded;
    myIdRef.current = loaded.userId;
  }, []);

  useEffect(() => {
    identityRef.current = identity;
    myIdRef.current = identity.userId;
  }, [identity]);
  useEffect(() => {
    roleRef.current = role;
  }, [role]);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  const send = useCallback((payload: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError("Not connected to the live server yet.");
      return;
    }
    ws.send(JSON.stringify(payload));
  }, []);

  const closePeer = useCallback((peerId: string) => {
    peersRef.current[peerId]?.close();
    delete peersRef.current[peerId];
    delete pendingRef.current[peerId];
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
  }, []);

  const teardownMedia = useCallback(() => {
    Object.keys(peersRef.current).forEach(closePeer);
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStreams(new Map());
  }, [closePeer]);

  const ensurePeer = useCallback(async (peerId: string) => {
    if (peersRef.current[peerId]) return peersRef.current[peerId];
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    } else {
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });
    }
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      send({
        type: "signal",
        to: peerId,
        signal: { type: "candidate", candidate: event.candidate },
      });
    };
    pc.ontrack = (event) => {
      const remote = event.streams[0];
      if (!remote) return;
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.set(peerId, remote);
        return next;
      });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        closePeer(peerId);
      }
    };
    peersRef.current[peerId] = pc;
    return pc;
  }, [closePeer, send]);

  const offerTo = useCallback(
    async (peerId: string) => {
      if (peerId === myIdRef.current) return;
      const pc = await ensurePeer(peerId);
      if (pc.signalingState !== "stable") return;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send({
        type: "signal",
        to: peerId,
        signal: { type: "offer", sdp: offer.sdp },
      });
    },
    [ensurePeer, send]
  );

  const flushCandidates = useCallback(async (peerId: string) => {
    const pc = peersRef.current[peerId];
    const pending = pendingRef.current[peerId] || [];
    if (!pc?.remoteDescription) return;
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.error("ICE error", err);
      }
    }
    pendingRef.current[peerId] = [];
  }, []);

  const handleSignal = useCallback(
    async (from: string, signal: SignalPayload) => {
      if (signal.type === "bye") {
        closePeer(from);
        return;
      }
      const pc = await ensurePeer(from);
      try {
        if (signal.type === "offer" && signal.sdp) {
          if (pc.signalingState !== "stable") {
            try {
              await pc.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit);
            } catch {
              closePeer(from);
              const fresh = await ensurePeer(from);
              await fresh.setRemoteDescription({ type: "offer", sdp: signal.sdp });
              const answer = await fresh.createAnswer();
              await fresh.setLocalDescription(answer);
              send({ type: "signal", to: from, signal: { type: "answer", sdp: answer.sdp } });
              return;
            }
          }
          await pc.setRemoteDescription({ type: "offer", sdp: signal.sdp });
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          send({
            type: "signal",
            to: from,
            signal: { type: "answer", sdp: answer.sdp },
          });
          await flushCandidates(from);
        } else if (signal.type === "answer" && signal.sdp) {
          await pc.setRemoteDescription({ type: "answer", sdp: signal.sdp });
          await flushCandidates(from);
        } else if (signal.type === "candidate" && signal.candidate) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(signal.candidate);
          } else {
            pendingRef.current[from] = pendingRef.current[from] || [];
            pendingRef.current[from].push(signal.candidate);
          }
        }
      } catch (err) {
        console.error("Signal handling failed", err);
      }
    },
    [closePeer, ensurePeer, flushCandidates, send]
  );

  const maybeOffer = useCallback(
    (user: PublicUser) => {
      const myRole = roleRef.current;
      const me = myIdRef.current;
      if (!user || user.userId === me) return;
      const iHaveMedia = Boolean(localStreamRef.current) && (myRole === "admin" || myRole === "performer");
      const theyHaveMedia = user.role === "admin" || user.role === "performer";
      const iAmOnStage = roomRef.current?.currentPerformer === me;
      if (iHaveMedia && theyHaveMedia) {
        void offerTo(user.userId);
      } else if (iAmOnStage && user.role === "viewer") {
        void offerTo(user.userId);
      }
    },
    [offerTo]
  );

  const applyRoom = useCallback((snapshot?: RoomSnapshot) => {
    if (!snapshot) return;
    setRoom(snapshot);
    roomRef.current = snapshot;
    const mine = snapshot.users?.find((user) => user.userId === myIdRef.current);
    if (mine) {
      setYou(mine);
      setRole(mine.role);
      roleRef.current = mine.role;
    }
  }, []);

  const acquireMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const handleMessageRef = useRef<(data: Record<string, any>) => Promise<void>>();
  const handleMessage = useCallback(
    async (data: Record<string, any>) => {
      if (data.error) {
        setError(data.error);
      }
      if (data.room) {
        applyRoom(data.room as RoomSnapshot);
      }
      if (data.you) {
        setYou(data.you);
        setRole(data.you.role);
        roleRef.current = data.you.role;
      }

      switch (data.type) {
        case "create-room":
        case "join-room":
          if (data.room) {
            sessionStorage.setItem(
              "talent.session",
              JSON.stringify({
                roomCode: data.room.roomCode,
                role: data.you?.role,
              })
            );
            if (Array.isArray(data.chat)) {
              setMessages(data.chat.map((m: Record<string, any>) => toChatMessage(m, myIdRef.current)));
            }
          }
          break;
        case "list-rooms":
          setRooms(Array.isArray(data.rooms) ? (data.rooms as RoomSummary[]) : []);
          break;
        case "role-changed":
          if (data.userId === myIdRef.current) {
            setNotice("You are now a host of this room.");
            try {
              await acquireMedia();
            } catch {
              setError("Camera and microphone permission is needed to co-host.");
              break;
            }
            // Start clean so the crew sees our new camera.
            Object.keys(peersRef.current).forEach((peerId) => {
              send({ type: "signal", to: peerId, signal: { type: "bye" } });
              closePeer(peerId);
            });
            ((data.room?.users || []) as PublicUser[]).forEach((user) => maybeOffer(user));
          } else if (data.username) {
            setNotice(`${data.username} is now a host.`);
          }
          break;
        case "user-joined":
          if (data.user) {
            // A returning user (refresh / reconnect) has a brand-new peer connection,
            // so drop our stale one before negotiating again.
            closePeer((data.user as PublicUser).userId);
            maybeOffer(data.user as PublicUser);
          }
          break;
        case "user-left":
          closePeer(data.userId || data.from);
          break;
        case "signal": {
          const payload = (data.payload || data.signal) as SignalPayload;
          if (data.from && payload) await handleSignal(data.from, payload);
          break;
        }
        case "send-message": {
          const incoming = toChatMessage(data, myIdRef.current);
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
          break;
        }
        case "cheer":
          setCheers((prev) => [
            { id: `${Date.now()}-${data.viewerName}-${Math.random().toString(36).slice(2, 6)}`, viewerName: data.viewerName, message: data.message, at: Date.now() },
            ...prev,
          ].slice(0, 8));
          setNotice(`${data.viewerName}: ${data.message}`);
          break;
        case "donation":
          setDonations((prev) => [
            {
              id: `${Date.now()}-${data.fromUsername}-${Math.random().toString(36).slice(2, 6)}`,
              fromUsername: data.fromUsername,
              amount: Number(data.amount) || 0,
              message: data.message,
              at: Date.now(),
            },
            ...prev,
          ].slice(0, 8));
          setNotice(`${data.fromUsername} donated $${Number(data.amount).toFixed(2)}`);
          break;
        case "vote":
          if (data.averageScore) {
            setNotice(`New vote in. Average is now ${data.averageScore}`);
          }
          break;
        case "admin-score":
          setNotice(`Host scored this performance ${data.score}/10`);
          break;
        case "performance-started": {
          const me = myIdRef.current;
          if (data.performerId === me || data.performerEmail === me) {
            const viewers = (roomRef.current?.users || []).filter((user) => user.role === "viewer");
            viewers.forEach((viewer) => void offerTo(viewer.userId));
          }
          setNotice("A performance just started.");
          break;
        }
        case "performance-ended":
          if (roleRef.current === "viewer") {
            const performerId = data.performerId || data.performerEmail;
            if (performerId) closePeer(performerId);
          }
          setNotice("Performance ended.");
          break;
        case "leave-room":
        case "room-closed":
        case "close-room":
          sessionStorage.removeItem("talent.session");
          teardownMedia();
          setRoom(null);
          setYou(null);
          setRole(null);
          setMessages([]);
          setCheers([]);
          setDonations([]);
          if (data.type === "room-closed") {
            setNotice("The host closed this room.");
          }
          break;
        default:
          break;
      }
    },
    [acquireMedia, applyRoom, closePeer, handleSignal, maybeOffer, offerTo, send, teardownMedia]
  );

  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  useEffect(() => {
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen = () => {
        if (cancelled) return;
        setConnected(true);
        // After a dropped connection, slip back into the room we were in.
        const current = roomRef.current;
        if (current?.roomCode) {
          void joinRoomRef.current?.({ roomCode: current.roomCode, role: roleRef.current || "viewer" });
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!cancelled) {
          retry = setTimeout(connect, 1500);
        }
      };
      ws.onerror = () => {
        setConnected(false);
      };
      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          await handleMessageRef.current?.(data);
        } catch (err) {
          console.error("Failed to parse message", err);
        }
      };
    };

    connect();
    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      wsRef.current?.close();
    };
  }, []);

  const identityPayload = useCallback(() => {
    const current = identityRef.current;
    return {
      userId: current.userId,
      secret: current.secret,
      username: current.username,
      email: current.email || "",
      profilePicUrl: current.profilePic || "",
      socialLinks: current.socialLinks,
    };
  }, []);

  const createRoom = useCallback(
    async (input: { roomName: string; roomCategory: string; performerDuration: number }) => {
      try {
        await acquireMedia();
      } catch {
        setError("Camera and microphone permission is required to host a room.");
        return;
      }
      setError(null);
      send({
        type: "create-room",
        ...identityPayload(),
        admin: identityRef.current.username,
        roomName: input.roomName,
        roomCategory: input.roomCategory,
        performerDuration: input.performerDuration,
      });
    },
    [acquireMedia, identityPayload, send]
  );

  const joinRoom = useCallback(
    async (input: { roomCode: string; role: UserRole }) => {
      if (input.role === "performer" || input.role === "admin") {
        try {
          await acquireMedia();
        } catch {
          setError("Camera and microphone permission is required for hosts and performers.");
          return;
        }
      }
      setError(null);
      send({
        type: "join-room",
        ...identityPayload(),
        roomCode: input.roomCode.trim().toLowerCase(),
        role: input.role,
      });
    },
    [acquireMedia, identityPayload, send]
  );

  const leaveRoom = useCallback(() => {
    send({ type: "leave-room" });
    sessionStorage.removeItem("talent.session");
    teardownMedia();
    setRoom(null);
    setYou(null);
    setRole(null);
    setMessages([]);
    setCheers([]);
    setDonations([]);
  }, [send, teardownMedia]);

  const closeRoom = useCallback(() => {
    send({ type: "close-room" });
  }, [send]);

  const sendChat = useCallback(
    (text: string) => {
      send({ type: "send-message", message: text, roomCode: roomRef.current?.roomCode });
    },
    [send]
  );

  const vote = useCallback(
    (score: number) => {
      send({
        type: "vote",
        roomCode: roomRef.current?.roomCode,
        performerId: roomRef.current?.currentPerformer,
        performerEmail: roomRef.current?.currentPerformer,
        score,
      });
    },
    [send]
  );

  const cheer = useCallback(
    (message: string) => {
      send({
        type: "cheer",
        roomCode: roomRef.current?.roomCode,
        performerId: roomRef.current?.currentPerformer,
        performerEmail: roomRef.current?.currentPerformer,
        message,
      });
    },
    [send]
  );

  const donate = useCallback(
    (amount: number, message: string) => {
      send({
        type: "donate",
        roomCode: roomRef.current?.roomCode,
        toUserID: roomRef.current?.currentPerformer,
        performerId: roomRef.current?.currentPerformer,
        amount,
        message,
      });
    },
    [send]
  );

  const adminScore = useCallback(
    (score: number) => {
      send({
        type: "admin-score",
        roomCode: roomRef.current?.roomCode,
        performerId: roomRef.current?.currentPerformer,
        performerEmail: roomRef.current?.currentPerformer,
        score,
      });
    },
    [send]
  );

  const joinQueue = useCallback(() => {
    send({ type: "join-queue", roomCode: roomRef.current?.roomCode });
  }, [send]);

  const leaveQueue = useCallback(() => {
    send({ type: "leave-queue" });
  }, [send]);

  const startPerformance = useCallback(
    (performerId?: string) => {
      send({
        type: "start-performance",
        roomCode: roomRef.current?.roomCode,
        performerId,
        performerEmail: performerId,
      });
    },
    [send]
  );

  const endPerformance = useCallback(() => {
    send({
      type: "end-performance",
      roomCode: roomRef.current?.roomCode,
      performerId: roomRef.current?.currentPerformer,
      performerEmail: roomRef.current?.currentPerformer,
    });
  }, [send]);

  const updateProfile = useCallback(() => {
    send({ type: "update-profile", ...identityPayload() });
  }, [identityPayload, send]);

  const setIdentity = useCallback((patch: Partial<Identity>) => {
    const next = saveIdentity(patch);
    setIdentityState(next);
    identityRef.current = next;
  }, []);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = muted;
    });
    setMuted((value) => !value);
  }, [muted]);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = videoOff;
    });
    setVideoOff((value) => !value);
  }, [videoOff]);

  useEffect(() => {
    joinRoomRef.current = joinRoom;
  }, [joinRoom]);

  const listRooms = useCallback(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "list-rooms" }));
    }
  }, []);

  const makeAdmin = useCallback(
    (userId: string) => {
      send({ type: "make-admin", userId });
    },
    [send]
  );

  const value = useMemo<SocketContextValue>(
    () => ({
      connected,
      identity,
      role,
      room,
      you,
      error,
      notice,
      messages,
      cheers,
      donations,
      rooms,
      localStream,
      remoteStreams,
      muted,
      videoOff,
      listRooms,
      makeAdmin,
      setIdentity,
      createRoom,
      joinRoom,
      leaveRoom,
      closeRoom,
      sendChat,
      vote,
      cheer,
      donate,
      adminScore,
      joinQueue,
      leaveQueue,
      startPerformance,
      endPerformance,
      updateProfile,
      toggleMute,
      toggleVideo,
      clearError: () => setError(null),
      clearNotice: () => setNotice(null),
    }),
    [
      adminScore,
      cheer,
      closeRoom,
      connected,
      createRoom,
      donate,
      donations,
      cheers,
      endPerformance,
      error,
      identity,
      joinQueue,
      joinRoom,
      leaveQueue,
      leaveRoom,
      listRooms,
      localStream,
      makeAdmin,
      messages,
      muted,
      notice,
      remoteStreams,
      role,
      room,
      rooms,
      sendChat,
      setIdentity,
      startPerformance,
      toggleMute,
      toggleVideo,
      updateProfile,
      videoOff,
      vote,
      you,
    ]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return ctx;
}
