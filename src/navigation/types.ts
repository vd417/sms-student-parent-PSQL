import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
};

export type InboxStackParamList = {
  InboxList: undefined;
  ChatThread: { id: string; name?: string; role?: string; kid?: string | null };
};

export type RootStackParamList = {
  Login: undefined;
  Main: NavigatorScreenParams<TabParamList> | undefined;
  Schedule: undefined;
  Attendance: undefined;
  HomeworkDetail: { id: string; studentId?: string };
  SubjectDetail: { id: string; studentId?: string };
  Grades: { studentId?: string } | undefined;
  ChatThread: { id: string; name?: string; role?: string };
  Announcements: undefined;
  Transport: undefined;
  PersonalInfo: undefined;
  Privacy: undefined;
  NotificationSettings: undefined;
};

export type TabParamList = {
  Home: undefined;
  Homework: undefined;
  Subjects: undefined;
  Inbox: NavigatorScreenParams<InboxStackParamList> | undefined;
  Profile: undefined;
};

export type ParentStackParamList = {
  Main: NavigatorScreenParams<ParentTabParamList> | undefined;
  Attendance: undefined;
  PTM: undefined;
  Transport: undefined;
  Leave: undefined;
  Announcements: undefined;
  ChatThread: { id: string; name?: string; role?: string; kid?: string | null };
  HomeworkDetail: { id: string; studentId?: string };
  Grades: { studentId?: string } | undefined;
  SubjectDetail: { id: string; studentId?: string };
  PersonalInfo: undefined;
  Privacy: undefined;
  NotificationSettings: undefined;
};

export type ParentTabParamList = {
  Home: undefined;
  Class: undefined;
  Fees: undefined;
  Inbox: NavigatorScreenParams<InboxStackParamList> | undefined;
  Profile: undefined;
};
