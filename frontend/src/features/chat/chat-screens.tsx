import { useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type {
  ChatConversationPage,
  ChatHistoryPage,
  ChatMessage,
} from '@ruteam/contracts';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { Button } from '../../components/ui/button';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { colors } from '../../theme/tokens';
import { tripDate } from '../trips/trip-feed';

function cursorPath(cursor?: string | null) {
  return cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
}

function requestId() {
  // This identifier deduplicates writes scoped to the authenticated sender.
  return (
    globalThis.crypto?.randomUUID?.() ??
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (kind) => {
      const digit = Math.floor(Math.random() * 16);
      return (kind === 'x' ? digit : (digit & 3) | 8).toString(16);
    })
  );
}

export function ConversationsScreen() {
  const { user } = useSession();
  const list = useInfiniteQuery({
    queryKey: ['chat-list', user?.id],
    enabled: !!user?.capabilities.passenger,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      api<ChatConversationPage>(`/chat/conversations${cursorPath(pageParam)}`, {
        signal,
      }),
    getNextPageParam: ({ nextCursor }) => nextCursor,
    refetchInterval: 15000,
  });
  const items = list.data?.pages.flatMap(({ items }) => items) ?? [];
  return (
    <ProtectedPage title="Mensajes">
      {list.isPending && <Text style={s.text}>Cargando conversaciones…</Text>}
      {list.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {list.error.message}
        </Text>
      )}
      {!list.isPending && !list.error && !items.length && (
        <View style={s.section}>
          <Text style={s.text}>
            Cuando publiques un viaje o confirmes una plaza, podrás coordinar el
            encuentro por aquí.
          </Text>
          <Link href="/available-trips" style={s.link}>
            Ver viajes disponibles
          </Link>
        </View>
      )}
      {!list.error &&
        items.map((item) => (
          <View key={item.tripId} style={s.section}>
            <Text style={s.title}>
              {item.originLabel} → {item.destinationLabel}
            </Text>
            <Text style={s.text}>
              {tripDate(item.departureAt)}
              {item.hasUnread ? ' · Mensajes nuevos' : ''}
            </Text>
            <Link
              href={{
                pathname: '/chat/[tripId]',
                params: { tripId: item.tripId },
              }}
              style={s.link}
            >
              Abrir conversación
            </Link>
          </View>
        ))}
      {list.hasNextPage && (
        <Button
          title="Ver más conversaciones"
          secondary
          disabled={list.isFetchingNextPage}
          onPress={() => {
            void list.fetchNextPage();
          }}
        />
      )}
    </ProtectedPage>
  );
}

function ChatRoom({ tripId, userId }: { tripId: string; userId: string }) {
  const client = useQueryClient();
  const historyKey = ['chat', userId, tripId];
  const endpoint = `/trips/${encodeURIComponent(tripId)}/chat`;
  const [body, setBody] = useState('');
  const [lastAttempt, setLastAttempt] = useState<{
    clientMessageId: string;
    body: string;
  }>();
  const [older, setOlder] = useState<ChatHistoryPage[]>([]);
  const history = useQuery({
    queryKey: historyKey,
    queryFn: ({ signal }) => api<ChatHistoryPage>(endpoint, { signal }),
    refetchInterval: 10000,
  });
  const loadOlder = useMutation({
    mutationFn: (cursor: string) =>
      api<ChatHistoryPage>(`${endpoint}${cursorPath(cursor)}`),
    onSuccess: (page) => setOlder((previous) => [...previous, page]),
  });
  const send = useMutation({
    mutationFn: (input: { clientMessageId: string; body: string }) =>
      api<ChatMessage>(`${endpoint}/messages`, { method: 'POST', body: input }),
    onSuccess: () => {
      setBody('');
      setLastAttempt(undefined);
      void client.invalidateQueries({ queryKey: historyKey });
    },
  });
  const read = useMutation({
    mutationFn: (messageId: string) =>
      api<void>(`${endpoint}/read`, { method: 'POST', body: { messageId } }),
    onSuccess: () => {
      for (const queryKey of [
        historyKey,
        ['chat-list'],
        ['notification-list'],
        ['notifications'],
      ])
        void client.invalidateQueries({ queryKey });
    },
  });
  const current = history.data;
  if (history.error)
    return (
      <Text accessibilityRole="alert" style={s.error}>
        {history.error.message}
      </Text>
    );
  if (!current) return <Text style={s.text}>Cargando conversación…</Text>;
  const messages = [
    ...new Map(
      [...current.messages, ...older.flatMap(({ messages }) => messages)].map(
        (message) => [message.id, message],
      ),
    ).values(),
  ];
  const cursor = (older.at(-1) ?? current).nextCursor;
  return (
    <>
      <Text style={s.title}>
        {current.conversation.originLabel} →{' '}
        {current.conversation.destinationLabel}
      </Text>
      {!current.conversation.canSend && (
        <Text style={s.text}>
          Viaje completado. Puedes consultar la conversación durante las 24
          horas posteriores.
        </Text>
      )}
      {!messages.length && (
        <Text style={s.text}>
          Aún no hay mensajes. Usa este chat para coordinar el encuentro.
        </Text>
      )}
      {cursor && (
        <Button
          title="Cargar mensajes anteriores"
          secondary
          disabled={loadOlder.isPending}
          onPress={() => loadOlder.mutate(cursor)}
        />
      )}
      {[...messages].reverse().map((message) => (
        <View
          key={message.id}
          style={[s.section, message.isMine && styles.mine]}
        >
          <Text style={s.title}>
            {message.isMine ? 'Tú' : message.authorName}
          </Text>
          <Text style={s.text}>{message.body}</Text>
          <Text style={s.text}>{tripDate(message.createdAt)}</Text>
        </View>
      ))}
      {(send.error || read.error || loadOlder.error) && (
        <Text accessibilityRole="alert" style={s.error}>
          {send.error?.message ??
            read.error?.message ??
            loadOlder.error?.message}
        </Text>
      )}
      {!!current.messages[0] && current.conversation.hasUnread && (
        <Button
          title="Marcar conversación como leída"
          secondary
          disabled={read.isPending}
          onPress={() => read.mutate(current.messages[0].id)}
        />
      )}
      {current.conversation.canSend && (
        <View style={s.section}>
          <TextInput
            accessibilityLabel="Mensaje"
            placeholder="Escribe un mensaje"
            multiline
            maxLength={1000}
            value={body}
            onChangeText={setBody}
            editable={!send.isPending}
            style={styles.input}
          />
          <Button
            title={send.isPending ? 'Enviando…' : 'Enviar mensaje'}
            disabled={!body.trim() || send.isPending}
            onPress={() => {
              const text = body.trim();
              const input =
                lastAttempt?.body === text
                  ? lastAttempt
                  : { clientMessageId: requestId(), body: text };
              setLastAttempt(input);
              send.mutate(input);
            }}
          />
        </View>
      )}
    </>
  );
}

export function ChatScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useSession();
  return (
    <ProtectedPage title="Chat del viaje">
      <Link href="/chat" style={s.link}>
        Volver a mensajes
      </Link>
      {!!tripId && !!user?.capabilities.passenger && (
        <ChatRoom key={tripId} tripId={tripId} userId={user.id} />
      )}
    </ProtectedPage>
  );
}

const styles = StyleSheet.create({
  mine: { backgroundColor: colors.selected },
  input: {
    minHeight: 72,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.ink,
    fontSize: 16,
  },
});
