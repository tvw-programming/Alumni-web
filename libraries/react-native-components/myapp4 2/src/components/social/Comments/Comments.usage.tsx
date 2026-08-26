/**
 * USAGE — CommentItem + CommentInputBar
 *
 * A working comment thread with optimistic insertion. Posting a comment inserts
 * it immediately with a `sending` state; the failure case stays on screen with a
 * retry rather than disappearing.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Comment, UserSummary } from '../types/domain';
import { CommentInputBar } from './CommentInputBar';
import { CommentItem } from './CommentItem';
import sample from './Comments.sample.json';

const data = loadSample<{
  currentUser: UserSummary;
  comments: Comment[];
  disabledReasons: Record<string, string>;
}>(sample);

type Mode = 'open' | 'off' | 'restricted' | 'slowMode';

export const CommentsUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>('open');
  const [comments, setComments] = useState<Comment[]>(data.comments);
  const [draft, setDraft] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | undefined>();
  const [sending, setSending] = useState(false);

  /** Optimistic insert, then reconcile with the server's answer. */
  const post = useCallback(
    async (body: string) => {
      const clientId = `tmp-${Date.now()}`;
      const optimistic: Comment = {
        id: clientId,
        clientId,
        author: data.currentUser,
        body,
        createdAt: new Date().toISOString(),
        status: 'sending',
        depth: replyingTo ? 1 : 0,
        parentId: replyingTo?.id,
        parentAuthorName: replyingTo?.author.displayName,
      };

      setComments((prev) => [...prev, optimistic]);
      setDraft('');
      setReplyingTo(undefined);
      setSending(true);

      await new Promise((resolve) => setTimeout(resolve, 900));
      setSending(false);

      // Anything containing "fail" is rejected, to exercise the failure path.
      const failed = body.toLowerCase().includes('fail');
      setComments((prev) =>
        prev.map((item) =>
          item.clientId === clientId ? { ...item, status: failed ? 'failed' : 'sent' } : item,
        ),
      );
      if (!failed) toast.success('Comment posted');
    },
    [replyingTo, toast],
  );

  const retry = useCallback(
    (comment: Comment) => {
      setComments((prev) =>
        prev.map((item) => (item.id === comment.id ? { ...item, status: 'sending' } : item)),
      );
      setTimeout(() => {
        setComments((prev) =>
          prev.map((item) => (item.id === comment.id ? { ...item, status: 'sent' } : item)),
        );
        toast.success('Comment posted');
      }, 800);
    },
    [toast],
  );

  return (
    <View style={styles.flex}>
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <SegmentedButtons
          value={mode}
          onValueChange={(next) => setMode(next as Mode)}
          density="small"
          buttons={[
            { value: 'open', label: 'Open' },
            { value: 'off', label: 'Off' },
            { value: 'restricted', label: 'Limited' },
            { value: 'slowMode', label: 'Slow' },
          ]}
        />
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Post a comment containing the word "fail" to see the failure-and-retry path. Replies state "Replying to …" in
          text, because indentation alone means nothing to a screen reader.
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.md }}>
        {comments.map((comment, index) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            index={index}
            entering="slideUp"
            onLike={(item) =>
              setComments((prev) =>
                prev.map((current) =>
                  current.id === item.id
                    ? {
                        ...current,
                        userLiked: !current.userLiked,
                        likeCount: (current.likeCount ?? 0) + (current.userLiked ? -1 : 1),
                      }
                    : current,
                ),
              )
            }
            onReply={(item) => setReplyingTo(item)}
            onRetry={retry}
            onPressAuthor={(item) => toast.show(`Opening ${item.author.displayName}`)}
            onViewReplies={(item) => toast.show(`Loading ${item.replyCount} replies`)}
            onReport={() => toast.show('Opening the report sheet')}
          />
        ))}
      </ScrollView>

      <CommentInputBar
        currentUser={data.currentUser}
        value={draft}
        onChangeText={setDraft}
        onSubmit={(body) => void post(body)}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(undefined)}
        sending={sending}
        disabledReason={mode === 'open' ? undefined : data.disabledReasons[mode]}
        onOpenEmoji={() => toast.show('Opening the emoji picker')}
        onMentionTrigger={() => setDraft((prev) => `${prev}@`)}
        onAttach={() => toast.show('Opening the image picker')}
        testID="comment-input"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
