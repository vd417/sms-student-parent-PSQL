import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { colors, fontFamily } from '@/theme';
import { navigationRef } from '@/navigation/navigationRef';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.warn('AppErrorBoundary', error.message, info.componentStack);
    }
  }

  private retry = () => this.setState({ error: null });

  private goHome = () => {
    this.setState({ error: null }, () => {
      if (navigationRef.isReady()) {
        navigationRef.dispatch(
          CommonActions.navigate({ name: 'Main', params: { screen: 'Home' } }),
        );
      }
    });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>The app hit an unexpected error. Your login was not cleared.</Text>
        <Pressable onPress={this.retry} style={styles.primary}>
          <Text style={styles.primaryText}>Retry</Text>
        </Pressable>
        <Pressable onPress={this.goHome} style={styles.secondary}>
          <Text style={styles.secondaryText}>Go Home</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  title: { fontFamily: fontFamily.bold, fontSize: 20, color: colors.ink, textAlign: 'center' },
  body: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  primary: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 100,
  },
  primaryText: { fontFamily: fontFamily.bold, color: colors.white, fontSize: 14 },
  secondary: { paddingHorizontal: 16, paddingVertical: 8 },
  secondaryText: { fontFamily: fontFamily.semiBold, color: colors.primary, fontSize: 14 },
});
