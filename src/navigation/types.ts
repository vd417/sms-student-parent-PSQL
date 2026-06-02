export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Schedule: undefined;
  HomeworkDetail: { id: string };
  SubjectDetail: { id: string };
  Grades: undefined;
  ChatThread: { id: string };
  Announcements: undefined;
};

export type TabParamList = {
  Home: undefined;
  Homework: undefined;
  Subjects: undefined;
  Inbox: undefined;
  Profile: undefined;
};

// Parent (used in Milestone 3)
export type ParentStackParamList = {
  Main: undefined;
  Attendance: undefined;
  PTM: undefined;
  Transport: undefined;
  Leave: undefined;
  Announcements: undefined;
  ChatThread: { id: string };
};

export type ParentTabParamList = {
  Home: undefined;
  Progress: undefined;
  Fees: undefined;
  Inbox: undefined;
  Profile: undefined;
};
