export interface ApiTodo {
  id: number;
  todo: string;
  completed: boolean;
  userId: number;
}

export interface ApiPost {
  id: number;
  title: string;
  body: string;
  userId: number;
  tags: string[];
  reactions: { likes: number; dislikes: number };
}

export interface ApiScenarioRun {
  label: string;
  completedAt: string;
  summary: string;
}
