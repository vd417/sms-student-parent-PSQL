import { render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ParentHomeScreen } from './ParentHomeScreen';
import { useChildren, useChildToday, useParentProfile } from '@/hooks/useParent';
import { useFees } from '@/hooks/useFees';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useNotifications } from '@/hooks/useNotifications';
import { useGrades } from '@/hooks/useGrades';
import { useSubjects } from '@/hooks/useSubjects';
import { useSelectedChild } from '@/providers/ChildProvider';
import { useSchool } from '@/hooks/useSchool';

jest.mock('@/hooks/useParent', () => ({
  useParentProfile: jest.fn(),
  useChildren: jest.fn(),
  useChildToday: jest.fn(),
}));
jest.mock('@/hooks/useFees', () => ({ useFees: jest.fn() }));
jest.mock('@/hooks/useAnnouncements', () => ({ useAnnouncements: jest.fn() }));
jest.mock('@/hooks/useNotifications', () => ({ useNotifications: jest.fn() }));
jest.mock('@/hooks/useGrades', () => ({ useGrades: jest.fn() }));
jest.mock('@/hooks/useSubjects', () => ({ useSubjects: jest.fn() }));
jest.mock('@/providers/ChildProvider', () => ({ useSelectedChild: jest.fn() }));
jest.mock('@/hooks/useSchool', () => ({ useSchool: jest.fn() }));

const idle = {
  data: undefined,
  isLoading: false,
  isPending: true,
  isError: false,
  isEnabled: true,
  isRefetching: false,
  refetch: jest.fn(),
  dataUpdatedAt: 0,
};

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderHome() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <NavigationContainer>
        <ParentHomeScreen />
      </NavigationContainer>
    </SafeAreaProvider>,
  );
}

describe('ParentHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSelectedChild as jest.Mock).mockReturnValue({ childId: '', setChildId: jest.fn() });
    (useParentProfile as jest.Mock).mockReturnValue(idle);
    (useChildren as jest.Mock).mockReturnValue(idle);
    (useChildToday as jest.Mock).mockReturnValue(idle);
    (useFees as jest.Mock).mockReturnValue(idle);
    (useAnnouncements as jest.Mock).mockReturnValue(idle);
    (useNotifications as jest.Mock).mockReturnValue(idle);
    (useGrades as jest.Mock).mockReturnValue(idle);
    (useSubjects as jest.Mock).mockReturnValue(idle);
    (useSchool as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
  });

  it('does not throw when profile is pending but not fetching', () => {
    expect(() => renderHome()).not.toThrow();
    expect(screen.queryByText(/Hello/)).toBeNull();
    expect(screen.queryByText('Something went wrong')).toBeNull();
  });

  it('renders a parent with no linked children', () => {
    (useParentProfile as jest.Mock).mockReturnValue({
      ...idle,
      isPending: false,
      isLoading: false,
      data: { name: 'Ramesh Rana', initials: 'RR', relation: 'Guardian', email: '', phone: '' },
    });
    (useChildren as jest.Mock).mockReturnValue({
      ...idle,
      isPending: false,
      data: [],
    });
    renderHome();
    expect(screen.getByText(/Hello Ramesh/)).toBeTruthy();
    expect(screen.getByText('No children are linked to this account yet.')).toBeTruthy();
  });

  it('renders when a child has no class label', () => {
    (useSelectedChild as jest.Mock).mockReturnValue({ childId: 'c1', setChildId: jest.fn() });
    (useParentProfile as jest.Mock).mockReturnValue({
      ...idle,
      isPending: false,
      data: { name: 'Ramesh Rana', initials: 'RR', relation: 'Guardian', email: '', phone: '' },
    });
    (useChildren as jest.Mock).mockReturnValue({
      ...idle,
      isPending: false,
      data: [
        {
          id: 'c1',
          name: 'Ward One',
          initials: 'WO',
          grade: null,
          school: '',
          avg: 0,
          attn: 0,
          fee: '',
          unread: 0,
          hue: 'blue',
        },
      ],
    });
    (useGrades as jest.Mock).mockReturnValue({
      ...idle,
      isPending: false,
      data: [{ id: 'g1', score: 10, max: 20 }],
    });
    expect(() => renderHome()).not.toThrow();
    expect(screen.getByText("Ward One's day")).toBeTruthy();
  });
});
