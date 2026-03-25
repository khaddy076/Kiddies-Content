import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Alert, TouchableOpacity, BackHandler, AppState,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { childApi } from '../../src/lib/api';

interface PlaybackInfo {
  videoId: string;
  platform: string;
  playerConfig: Record<string, number>;
  screenTimeRemaining: number;
}

// Injected JS that runs inside the WebView to lock down the YouTube player
const LOCKDOWN_JS = `
(function() {
  // Block all external navigation
  window.open = function() { return null; };
  window.location.assign = function() {};

  // Wait for player to mount, then strip dangerous elements
  function lockDown() {
    // Remove YouTube logo link
    var logo = document.querySelector('.ytp-youtube-button');
    if (logo) logo.style.display = 'none';

    // Remove "Watch on YouTube" overlay
    var watchOnYT = document.querySelector('.ytp-impression-link');
    if (watchOnYT) watchOnYT.remove();

    // Remove related video panels
    var related = document.querySelector('.ytp-endscreen-content');
    if (related) related.style.display = 'none';

    // Block cards and annotations
    var cards = document.querySelector('.ytp-cards-teaser');
    if (cards) cards.style.display = 'none';

    // Intercept all link clicks
    document.addEventListener('click', function(e) {
      var target = e.target;
      if (target && target.tagName === 'A' && target.href) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }, true);
  }

  // Run immediately and watch for DOM changes
  lockDown();
  var observer = new MutationObserver(lockDown);
  observer.observe(document.body, { childList: true, subtree: true });

  // Send player state messages to React Native
  window.addEventListener('message', function(e) {
    if (e.data && e.data.event) {
      window.ReactNativeWebView.postMessage(JSON.stringify(e.data));
    }
  });

  true; // required for injectedJavaScript
})();
`;

function buildPlayerHTML(videoId: string, config: Record<string, number>): string {
  const params = Object.entries({ ...config, enablejsapi: 1 })
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #000; overflow: hidden; }
  #player { width: 100vw; height: 100vh; }
</style>
</head>
<body>
<div id="player"></div>
<script>
  var tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);

  var player;
  function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
      videoId: '${videoId}',
      playerVars: { ${params} },
      events: {
        onStateChange: function(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'stateChange', state: e.data }));
        },
        onReady: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'ready' }));
          player.playVideo();
        },
        onError: function(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'error', code: e.data }));
        }
      }
    });
  }
</script>
</body>
</html>`;
}

export default function WatchScreen() {
  const { contentId } = useLocalSearchParams<{ contentId: string }>();
  const router = useRouter();
  const [playbackInfo, setPlaybackInfo] = useState<PlaybackInfo | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [watchSeconds, setWatchSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const endSession = useCallback(async () => {
    if (!sessionId) return;
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    try {
      await childApi.endSession(sessionId, elapsed);
    } catch {
      // ignore on cleanup
    }
    if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
  }, [sessionId]);

  useEffect(() => {
    if (!contentId) return;

    // Load playback info
    childApi.getWatchToken(contentId)
      .then((res) => {
        setPlaybackInfo(res.data.data);
        // Start session
        return childApi.startSession(contentId);
      })
      .then((sessionRes) => {
        setSessionId(sessionRes.data.data.sessionId);
        startTimeRef.current = Date.now();
      })
      .catch((err: unknown) => {
        const e = err as { response?: { data?: { error?: { message?: string } } } };
        setError(e.response?.data?.error?.message ?? 'Cannot play this video right now');
      })
      .finally(() => setLoading(false));
  }, [contentId]);

  useEffect(() => {
    if (!sessionId) return;

    // Send heartbeat every 30 seconds
    heartbeatTimer.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setWatchSeconds(elapsed);
      childApi.heartbeat(sessionId, elapsed).catch(() => {});
    }, 30000);

    return () => {
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    };
  }, [sessionId]);

  // End session on unmount / background
  useEffect(() => {
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        void endSession();
      }
    });

    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert('Stop watching?', 'Your progress will be saved.', [
        { text: 'Keep watching', style: 'cancel' },
        { text: 'Leave', onPress: () => { void endSession().then(() => router.back()); } },
      ]);
      return true;
    });

    return () => {
      appStateSub.remove();
      backSub.remove();
      void endSession();
    };
  }, [endSession, router]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorEmoji}>⏰</Text>
        <Text style={styles.errorTitle}>{error}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!playbackInfo) return null;

  const html = buildPlayerHTML(playbackInfo.videoId, playbackInfo.playerConfig);

  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity
        onPress={() => Alert.alert('Stop watching?', '', [
          { text: 'Keep watching', style: 'cancel' },
          { text: 'Leave', onPress: () => { void endSession().then(() => router.back()); } },
        ])}
        style={styles.closeBtn}
      >
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>

      <WebView
        source={{ html }}
        style={styles.player}
        injectedJavaScript={LOCKDOWN_JS}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data) as { event: string };
            if (data.event === 'stateChange') {
              // State -1=unstarted, 0=ended, 1=playing, 2=paused, 3=buffering, 5=video cued
            }
          } catch {
            // ignore
          }
        }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        // Security: prevent navigation away from the player
        onShouldStartLoadWithRequest={(request) => {
          return request.url.includes('youtube.com') || request.url.includes('google.com') || request.url === 'about:blank';
        }}
        onNavigationStateChange={(state) => {
          // If the webview navigates away from YouTube, prevent it
          if (!state.url.includes('youtube.com') && !state.url.startsWith('about:')) {
            // Force back to player
          }
        }}
      />

      {/* Screen time remaining indicator */}
      {playbackInfo.screenTimeRemaining <= 10 && (
        <View style={styles.timeWarning}>
          <Text style={styles.timeWarningText}>
            ⏰ {playbackInfo.screenTimeRemaining} minutes of screen time remaining
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FA', padding: 24 },
  loadingText: { fontSize: 18, color: '#6B7280', marginTop: 16 },
  errorEmoji: { fontSize: 56, marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', textAlign: 'center', marginBottom: 24 },
  backBtn: { backgroundColor: '#6C63FF', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12 },
  backBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  player: { flex: 1 },
  closeBtn: { position: 'absolute', top: 50, left: 16, zIndex: 10, width: 40, height: 40, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  timeWarning: { position: 'absolute', bottom: 60, left: 16, right: 16, backgroundColor: 'rgba(239,68,68,0.9)', borderRadius: 12, padding: 12 },
  timeWarningText: { color: '#fff', fontWeight: '700', textAlign: 'center', fontSize: 14 },
});
