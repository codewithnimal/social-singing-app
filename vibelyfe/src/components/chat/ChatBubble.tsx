// Vibely — Component: ChatBubble (text & singing messages)

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AudioPlayer } from '../audio/AudioPlayer';
import { Colors } from '../../theme/colors';
import { FontFamily, FontSize } from '../../theme/typography';
import { Radius } from '../../theme/radius';
import { formatTimestamp } from '../../utils/time';
import { Message, SingingMessage, TextMessage } from '../../types';

interface ChatBubbleProps {
  message: Message;
  onSingBack?: () => void;
}

export function ChatBubble({ message, onSingBack }: ChatBubbleProps) {
  if (message.type === 'text') {
    return <TextBubble message={message as TextMessage} />;
  }
  return <SingingBubble message={message as SingingMessage} onSingBack={onSingBack} />;
}

// ─── TextBubble ─────────────────────────────────────────────────────────────

function TextBubble({ message }: { message: TextMessage }) {
  return (
    <View style={[styles.row, message.isOwn && styles.rowOwn]}>
      <View
        style={[
          styles.textBubble,
          message.isOwn ? styles.textOwn : styles.textOther,
        ]}
      >
        <Text style={[styles.text, message.isOwn && styles.textOwnColor]}>
          {message.text}
        </Text>
        <View style={styles.timestampRow}>
          <Text style={styles.timestamp}>{formatTimestamp(message.timestamp)}</Text>
          {message.isOwn && (
            <Text style={styles.status}>
              {message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓✓' : '✓'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── SingingBubble ──────────────────────────────────────────────────────────

function SingingBubble({ message, onSingBack }: { message: SingingMessage; onSingBack?: () => void }) {
  return (
    <View style={[styles.row, message.isOwn && styles.rowOwn]}>
      {message.isOwn ? (
        <LinearGradient
          colors={['rgba(109,40,217,0.6)', 'rgba(23,16,34,0.8)']}
          style={[styles.singingBubble, styles.singingOwn]}
        >
          <SingingBubbleContent message={message} isOwn onSingBack={onSingBack} />
        </LinearGradient>
      ) : (
        <View style={[styles.singingBubble, styles.singingOther]}>
          <SingingBubbleContent message={message} isOwn={false} onSingBack={onSingBack} />
        </View>
      )}
    </View>
  );
}

function SingingBubbleContent({
  message,
  isOwn,
  onSingBack,
}: {
  message: SingingMessage;
  isOwn: boolean;
  onSingBack?: () => void;
}) {
  return (
    <>
      <View style={styles.singingLabel}>
        <Text style={styles.singingLabelIcon}>🎵</Text>
        <Text style={styles.singingLabelText}>Singing message</Text>
      </View>
      <AudioPlayer message={message} compact />
      <View style={styles.singingFooter}>
        <Text style={styles.timestamp}>{formatTimestamp(message.timestamp)}</Text>
        {!isOwn && onSingBack && (
          <TouchableOpacity
            onPress={onSingBack}
            style={styles.singBackButton}
            accessibilityLabel="Sing back"
          >
            <LinearGradient
              colors={Colors.gradient.primary as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.singBackGradient}
            >
              <Text style={styles.singBackText}>🎤 Sing Back</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  rowOwn: {
    justifyContent: 'flex-end',
  },

  // Text bubbles
  textBubble: {
    maxWidth: '75%',
    borderRadius: Radius.lg,
    padding: 12,
    gap: 4,
  },
  textOther: {
    backgroundColor: Colors.surface.dark,
    borderBottomLeftRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  textOwn: {
    backgroundColor: Colors.brand.purple,
    borderBottomRightRadius: Radius.xs,
  },
  text: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  textOwnColor: {
    color: Colors.text.primary,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  timestamp: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  status: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.brand.violet,
  },

  // Singing bubbles
  singingBubble: {
    maxWidth: '82%',
    borderRadius: Radius.xl,
    padding: 16,
    gap: 12,
  },
  singingOther: {
    backgroundColor: Colors.surface.glass,
    borderWidth: 1,
    borderColor: Colors.surface.borderActive,
    borderBottomLeftRadius: Radius.xs,
  },
  singingOwn: {
    borderBottomRightRadius: Radius.xs,
  },
  singingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  singingLabelIcon: {
    fontSize: 14,
  },
  singingLabelText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.brand.violet,
  },
  singingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  singBackButton: {
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  singBackGradient: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  singBackText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
});
