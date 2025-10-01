export interface PubSub {
  publish(channel: string, message: any): Promise<void>
  subscribe(channel: string): AsyncIterator<any>
}
