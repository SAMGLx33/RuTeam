import { useEffect, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, useWindowDimensions } from 'react-native';
import { Pressable, Text, View } from '../../theme/primitives';
import { useAppearance } from '../../theme/appearance';
import { breakpoints, colors, radii } from '../../theme/tokens';
import { Icon } from './icon';

export function BottomSheet({
  title,
  summary,
  children,
  initiallyExpanded = true,
}: {
  title: string;
  summary?: ReactNode;
  children: ReactNode;
  initiallyExpanded?: boolean;
}) {
  const { width } = useWindowDimensions();
  const { reducedMotion } = useAppearance();
  const wide = width >= breakpoints.sidebar;
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [fade] = useState(() => new Animated.Value(1));
  const open = wide || expanded;
  useEffect(() => {
    if (!open || reducedMotion) {
      fade.setValue(1);
      return;
    }
    fade.setValue(0.65);
    const animation = Animated.timing(fade, {
      toValue: 1,
      duration: 170,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [fade, open, reducedMotion]);
  return (
    <View style={[styles.sheet, !wide && styles.mobile]}>
      {!wide && <View style={styles.handle} />}
      {wide ? (
        <Text role="heading" aria-level={2} style={styles.title}>
          {title}
        </Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${expanded ? 'Plegar' : 'Expandir'} ${title}`}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded(!expanded)}
          style={styles.header}
        >
          <Text role="heading" aria-level={2} style={styles.title}>
            {title}
          </Text>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={19} />
        </Pressable>
      )}
      {summary}
      {open && (
        <Animated.View style={[styles.content, { opacity: fade }]}>
          {children}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.panel,
    padding: 17,
    gap: 10,
  },
  mobile: {
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
  },
  handle: {
    width: 34,
    height: 4,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  header: {
    minHeight: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.45,
    color: colors.ink,
    flexShrink: 1,
  },
  content: { gap: 9 },
});
