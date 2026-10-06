import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, ScrollView, Alert } from 'react-native';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { AudioRecorder } from '../components/AudioRecorder';
import { uploadAudioMessage } from '../api/chat';
import * as FileSystem from 'expo-file-system/legacy';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';

// Base URL without /api/v1 suffix for constructing download URLs
function getServerBase(): string {
  const base = apiClient.defaults.baseURL ?? 'http://localhost:8000/api/v1';
  return base.replace(/\/api\/v1\/?$/, '');
}

export const HomeScreen = () => {
  const [health, setHealth] = useState<string>('Checking...');
  const [user, setUser] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const { logout } = useContext(AuthContext);
  
  const currentPlayerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    apiClient.get('/auth/me')
      .then(res => setUser(res.data))
      .catch(err => console.error(err));

    // Fetch friends list
    apiClient.get('/friends/list')
      .then(res => {
        if (res.data.friends.length > 0) {
          setFriends(res.data.friends);
          setSelectedFriend(res.data.friends[0]); // Default to first friend for testing
        }
      })
      .catch(err => console.error("Could not fetch friends", err));
      
    return () => {
        if (currentPlayerRef.current) {
            currentPlayerRef.current.pause();
            currentPlayerRef.current.remove();
        }
    };
  }, []);

  const fetchMessages = () => {
    if (!selectedFriend) return;
    apiClient.get(`/chat/history/${selectedFriend.id}`)
      .then(res => setMessages(res.data.items.reverse())) // reverse to show oldest top
      .catch(err => console.error("Could not fetch messages", err));
  };

  useEffect(() => {
    fetchMessages();
  }, [selectedFriend]);

  const handleSendAudio = async (uri: string) => {
    if (!selectedFriend) return;
    const clientMsgId = Math.random().toString(36).substring(2, 15) + Date.now().toString();
    await uploadAudioMessage(selectedFriend.id, uri, 1000, clientMsgId);
    fetchMessages(); // refresh list
  };

  const playMessage = async (msg: any) => {
      if (!msg.audio_url) return;
      
      try {
          if (currentPlayerRef.current) {
              currentPlayerRef.current.pause();
              currentPlayerRef.current.remove();
              currentPlayerRef.current = null;
          }

          // The audio_url from backend might just be a relative path if it's our serve endpoint
          const urlStr = msg.audio_url.startsWith('http') ? msg.audio_url : `${getServerBase()}${msg.audio_url}`;
          
          const docDir = FileSystem.documentDirectory ?? '';
          const localPath = `${docDir}msg_${msg.id}_${Date.now()}.wav`;
          const authHeader = apiClient.defaults.headers.common['Authorization'] as string;

          const downloadRes = await FileSystem.downloadAsync(urlStr, localPath, {
             headers: { Authorization: authHeader },
          });

          if (downloadRes.status !== 200) {
              if (downloadRes.status === 403) {
                  Alert.alert('Locked', 'This message has reached its play limit.');
              } else {
                  throw new Error(`Download failed with status ${downloadRes.status}`);
              }
              // Refresh to get updated play count
              fetchMessages();
              return;
          }

          const player = createAudioPlayer(downloadRes.uri);
          currentPlayerRef.current = player;
          player.play();
          
          // Refresh list to update play count after successful play
          fetchMessages();
          
      } catch (e: any) {
          Alert.alert("Playback Error", e.message || "Failed to play audio");
      }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Social Singing App</Text>
      
      {selectedFriend ? (
        <View style={{ width: '100%', flex: 1 }}>
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.friendText}>Chatting with: {selectedFriend.username}</Text>
          </View>
          
          <ScrollView style={styles.messagesContainer} contentContainerStyle={{ paddingBottom: 20 }}>
            {messages.map((msg: any) => {
                const isMe = user && msg.sender_id === user.id;
                const isLocked = !isMe && msg.play_count >= msg.max_plays;
                const playsLeft = Math.max(0, msg.max_plays - msg.play_count);
                
                return (
                    <View key={msg.id} style={[styles.messageBubble, isMe ? styles.messageMe : styles.messageThem]}>
                        <Text style={{fontWeight: 'bold', color: isMe ? '#fff' : '#000'}}>
                            {isMe ? 'You' : selectedFriend.username}
                        </Text>
                        
                        {msg.audio_url ? (
                            <View style={{marginTop: 5, flexDirection: 'row', alignItems: 'center'}}>
                                <TouchableOpacity 
                                    style={[styles.playBtn, isLocked && styles.playBtnLocked]}
                                    onPress={() => !isLocked && playMessage(msg)}
                                    disabled={isLocked}
                                >
                                    <Text style={{color: '#fff'}}>{isLocked ? '🔒 Locked' : '▶ Play Audio'}</Text>
                                </TouchableOpacity>
                                
                                {!isMe && (
                                    <Text style={[styles.playCount, isLocked && {color: '#ef4444'}]}>
                                        {isLocked ? 'Limit reached' : `${playsLeft} play${playsLeft !== 1 ? 's' : ''} left`}
                                    </Text>
                                )}
                            </View>
                        ) : (
                            <Text>{msg.content}</Text>
                        )}
                    </View>
                );
            })}
            {messages.length === 0 && <Text style={{textAlign: 'center', marginTop: 20, color: '#888'}}>No messages yet. Send a song!</Text>}
          </ScrollView>

          <View style={{ alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderColor: '#ccc' }}>
             <AudioRecorder onSend={handleSendAudio} />
          </View>
        </View>
      ) : (
        <Text style={{ marginTop: 20, color: '#ef4444' }}>You have no friends to send audio to! Please add a friend via API first.</Text>
      )}

      <View style={{ padding: 10 }}>
        <Button title="Logout" onPress={logout} color="red" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#f3f4f6'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center'
  },
  friendText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    marginTop: 10,
    marginBottom: 5,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  messageBubble: {
      padding: 12,
      borderRadius: 12,
      marginVertical: 4,
      maxWidth: '85%'
  },
  messageMe: {
      alignSelf: 'flex-end',
      backgroundColor: '#3b82f6',
  },
  messageThem: {
      alignSelf: 'flex-start',
      backgroundColor: '#e5e7eb',
  },
  playBtn: {
      backgroundColor: '#10b981',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      marginRight: 10
  },
  playBtnLocked: {
      backgroundColor: '#9ca3af'
  },
  playCount: {
      fontSize: 12,
      color: '#6b7280',
      fontStyle: 'italic'
  }
});
