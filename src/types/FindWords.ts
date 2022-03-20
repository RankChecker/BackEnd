import { Page } from "puppeteer";

export interface ClusterData {
  page: Page;
  data: {
    keywords: string[];
    offset: number;
  };
}

export interface WordPositionOnGoogle {
  id?: number;
  position: number;
  keyword: string;
  link: string;
  page: number;
  status?: boolean;
}

export interface SearchStatusMessage {
  message: string;
}

export interface TaskClusterData {
  keywords: string[];
  offset: number;
}

export interface SocketSearchStatus {
  client: string;
  url: string;
  status: number;
  keywords: WordPositionOnGoogle[];
  count: number;
}

export interface SocketSearchMessage {
  message: string;
}
