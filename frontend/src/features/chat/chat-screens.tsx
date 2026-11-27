import { Fragment, useEffect, useRef, useState, type RefObject } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { type ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
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
import { Icon } from '../../components/ui/icon';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { useAppearance } from '../../theme/appearance';
import { Link, Text, TextInput, View } from '../../theme/primitives';
import { breakpoints, colors, radii } from '../../theme/tokens';
import { tripDate } from '../trips/trip-feed';
import { tripStatusLabel } from '../trips/route-preview';

const messageDay = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  dateStyle: 'long',
});
const messageTime = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  timeStyle: 'short',
});

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

function ConversationsPanel({ activeTrip }: { activeTrip?: string }) {
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
    <View style={styles.panelList}>
      {list.isPending && <Text style={s.text}>Cargando conversaciones…</Text>}
      {list.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {list.error.message}
        </Text>
      )}
      {!list.isPending && !list.error && !items.length && (
        <View style={[s.section, styles.empty]}>
          <View style={styles.conversationIcon}>
            <Icon name="message-circle" size={19} />
          </View>
          <Text role="heading" aria-level={2} style={s.title}>
            Aún no tienes conversaciones
          </Text>
          <Text style={s.text}>
            Cuando publiques un viaje o confirmes una plaza, podrás coordinar el
            encuentro por aquí.
          </Text>
          <Link href="/available-trips" style={s.link}>
            Ver viajes disponibles
          </Link>
        </View>
      )}
      {!list.error && items.length > 0 && (
        <View style={styles.conversations}>
          {items.map((item, index) => (
            <View
              key={item.tripId}
              style={[
                styles.conversation,
                index > 0 && styles.divider,
                item.hasUnread && styles.unreadConversation,
                activeTrip === item.tripId && styles.activeConversation,
              ]}
            >
              <View style={styles.conversationHeading}>
                <View style={styles.conversationIcon}>
                  <Icon name="message-circle" size={18} />
                </View>
                <View style={styles.conversationContent}>
                  <View style={styles.wrapRow}>
                    <Text style={styles.routeLabel}>
                      {item.originLabel} → {item.destinationLabel}
                    </Text>
                    {item.hasUnread && (
                      <Text style={styles.unreadBadge}>
                        {item.unreadCount ?? 1} sin leer
                      </Text>
                    )}
                  </View>
                  <Text style={styles.meta}>
                    {tripDate(item.departureAt)} ·{' '}
                    {item.canSend
                      ? tripStatusLabel[item.status]
                      : 'Solo lectura'}
                  </Text>
                </View>
              </View>
              <Link
                href={{
                  pathname: '/chat/[tripId]',
                  params: { tripId: item.tripId },
                }}
                aria-current={activeTrip === item.tripId ? 'page' : undefined}
                style={[
                  styles.actionLink,
                  item.hasUnread && styles.unreadAction,
                ]}
              >
                Abrir conversación
              </Link>
            </View>
          ))}
        </View>
      )}
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
    </View>
  );
}

export function ConversationsScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= breakpoints.columns;
  return (
    <ProtectedPage title="Mensajes">
      <View style={wide ? styles.split : undefined}>
        <View style={wide ? styles.sidebar : undefined}>
          <ConversationsPanel />
        </View>
        {wide && (
          <View style={[s.section, styles.room, styles.openHint]}>
            <Icon name="message-circle" size={27} />
            <Text style={s.title}>Abre una conversación</Text>
            <Text style={s.text}>
              Coordina los detalles de tu viaje desde Mensajes.
            </Text>
          </View>
        )}
      </View>
    </ProtectedPage>
  );
}

function ChatRoom({
  tripId,
  userId,
  scrollRef,
}: {
  tripId: string;
  userId: string;
  scrollRef: RefObject<ScrollView | null>;
}) {
  const client = useQueryClient();
  const { reducedMotion } = useAppearance();
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
  const newest = current?.messages[0]?.id;
  useEffect(() => {
    if (!newest) return;
    const frame = requestAnimationFrame(() =>
      scrollRef.current?.scrollToEnd({ animated: !reducedMotion }),
    );
    return () => cancelAnimationFrame(frame);
  }, [newest, reducedMotion, scrollRef]);
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
  ].reverse();
  const cursor = (older.at(-1) ?? current).nextCursor;
  return (
    <>
      <View style={[s.section, styles.roomHeader]}>
        <Text role="heading" aria-level={2} style={styles.routeLabel}>
          {current.conversation.originLabel} →{' '}
          {current.conversation.destinationLabel}
        </Text>
        <Text style={styles.meta}>
          {tripDate(current.conversation.departureAt)} ·{' '}
          {tripStatusLabel[current.conversation.status]}
        </Text>
        {!current.conversation.canSend && (
          <Text style={styles.readOnly}>
            Solo lectura. Puedes consultar la conversación durante las 24 horas
            posteriores al cierre del viaje.
          </Text>
        )}
      </View>
      <View style={[s.section, styles.messages]}>
        {cursor && (
          <View style={styles.centered}>
            <Button
              title="Cargar mensajes anteriores"
              secondary
              disabled={loadOlder.isPending}
              onPress={() => loadOlder.mutate(cursor)}
            />
          </View>
        )}
        {!messages.length && (
          <Text style={[s.text, styles.centeredText]}>
            {current.conversation.canSend
              ? 'Aún no hay mensajes. Usa este chat para coordinar el encuentro.'
              : 'No se enviaron mensajes en esta conversación.'}
          </Text>
        )}
        {messages.map((message, index) => {
          const date = new Date(message.createdAt);
          const day = messageDay.format(date);
          const previous = messages[index - 1];
          const newDay =
            !previous ||
            day !== messageDay.format(new Date(previous.createdAt));
          return (
            <Fragment key={message.id}>
              {newDay && <Text style={styles.day}>{day}</Text>}
              <View style={[styles.bubble, message.isMine && styles.outgoing]}>
                <Text style={styles.author}>
                  {message.isMine ? 'Tú' : message.authorName}
                </Text>
                <Text selectable style={styles.body}>
                  {message.body}
                </Text>
                <Text style={styles.time}>{messageTime.format(date)}</Text>
              </View>
            </Fragment>
          );
        })}
      </View>
      {(send.error || read.error || loadOlder.error) && (
        <Text accessibilityRole="alert" style={s.error}>
          {send.error?.message ??
            read.error?.message ??
            loadOlder.error?.message}
        </Text>
      )}
      {!!current.messages[0] && current.conversation.hasUnread && (
        <View style={styles.centered}>
          <Button
            title="Marcar conversación como leída"
            secondary
            disabled={read.isPending}
            onPress={() => read.mutate(current.messages[0].id)}
          />
        </View>
      )}
      {current.conversation.canSend && (
        <View style={[s.section, styles.composer]}>
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
            title={
              send.isPending
                ? 'Enviando…'
                : send.error && lastAttempt?.body === body.trim()
                  ? 'Reintentar envío'
                  : 'Enviar mensaje'
            }
            disabled={!body.trim() || send.isPending}
            loading={send.isPending}
            icon="send"
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
  const scrollRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const wide = width >= breakpoints.columns;
  return (
    <ProtectedPage title="Chat del viaje" scrollRef={scrollRef}>
      <View style={wide ? styles.split : undefined}>
        {wide && (
          <View style={styles.sidebar}>
            <Text style={s.title}>Conversaciones</Text>
            <ConversationsPanel activeTrip={tripId} />
          </View>
        )}
        <View style={styles.room}>
          {!wide && (
            <Link href="/chat" style={styles.actionLink}>
              Volver a mensajes
            </Link>
          )}
          {!!tripId && !!user?.capabilities.passenger && (
            <ChatRoom
              key={tripId}
              tripId={tripId}
              userId={user.id}
              scrollRef={scrollRef}
            />
          )}
        </View>
      </View>
    </ProtectedPage>
  );
}

const styles = StyleSheet.create({
  split: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  panelList: { gap: 12 },
  sidebar: { width: '34%', minWidth: 230, maxWidth: 360, gap: 11 },
  room: { flex: 1, minWidth: 0, gap: 13 },
  openHint: { minHeight: 250, alignItems: 'center', justifyContent: 'center' },
  activeConversation: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  empty: { alignItems: 'flex-start' },
  conversations: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.panel,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  conversation: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 18,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  divider: { borderTopWidth: 1, borderColor: colors.border },
  conversationHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 260,
  },
  conversationIcon: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.control,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  conversationContent: { flex: 1, minWidth: 0, gap: 4 },
  unreadConversation: { backgroundColor: colors.selected },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  routeLabel: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  unreadBadge: {
    color: colors.primary,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.control,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 12,
    fontWeight: '700',
  },
  actionLink: {
    color: colors.primary,
    alignSelf: 'flex-start',
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  unreadAction: { color: colors.ink, textDecorationLine: 'underline' },
  roomHeader: { gap: 5 },
  readOnly: {
    marginTop: 4,
    color: colors.muted,
    lineHeight: 20,
  },
  messages: { gap: 12, minHeight: 135 },
  centered: { alignSelf: 'center' },
  centeredText: { marginVertical: 12, textAlign: 'center' },
  day: {
    alignSelf: 'center',
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 4,
  },
  bubble: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    minWidth: 100,
    gap: 3,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: colors.background,
  },
  outgoing: {
    alignSelf: 'flex-end',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
    borderColor: colors.selected,
    backgroundColor: colors.selected,
  },
  author: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  body: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  time: { alignSelf: 'flex-end', color: colors.muted, fontSize: 11 },
  composer: {
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  input: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 240,
    minHeight: 48,
    maxHeight: 150,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    textAlignVertical: 'top',
    backgroundColor: colors.background,
    color: colors.ink,
    fontSize: 16,
  },
});
