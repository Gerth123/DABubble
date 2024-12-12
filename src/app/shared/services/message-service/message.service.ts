import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { ChannelMessage } from '../../models/channel-message.model';
import {
  collection,
  deleteDoc,
  DocumentReference,
  updateDoc,
} from 'firebase/firestore';
import { deleteField, doc, getDoc } from 'firebase/firestore';
import { Firestore } from '@angular/fire/firestore';
import { collectionData, docData } from 'rxfire/firestore';
import { UserService } from '../user-service/user.service';
import { UserData } from '../../models/user.model';
import { ThreadMessage } from '../../models/thread-message.model';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private firestore = inject(Firestore);
  private messages: ChannelMessage[] = [];
  private messagesSubject = new BehaviorSubject<ChannelMessage[]>(
    this.messages
  );
  messages$ = this.messagesSubject.asObservable();
  public editMessageId: string | null = null;
  private userService = inject(UserService);
  private actualMessageSubject = new BehaviorSubject<ChannelMessage | null>(
    null
  );
  actualMessage$ = this.actualMessageSubject.asObservable();
  private messagesDataMap = new Map<string, Map<string, ChannelMessage>>();
  private messagesDataMapSubject = new BehaviorSubject<
    Map<string, Map<string, ChannelMessage>>
  >(this.messagesDataMap);
  private messagesSubscription: Subscription | undefined;
  private userDataSubscription: Subscription | undefined;

  /**
   * Getter for the messagesDataMap$ Observable
   * @returns The observable of the messagesDataMap
   */
  get messagesDataMap$() {
    return this.messagesDataMapSubject.asObservable();
  }

  /**
   * Unsubscribes from subscriptions when the component is destroyed.
   */
  ngOnDestroy(): void {
    this.messagesSubscription?.unsubscribe();
    this.userDataSubscription?.unsubscribe();
  }

  /**
   * Loads messages for a specific channel.
   * @param channelId The ID of the channel to load messages for.
   */
  loadMessagesForChannel(channelId: string): void {
    const messagesCollection = collection(
      this.firestore,
      `channels/${channelId}/messages`
    );
    this.messagesSubscription = collectionData(messagesCollection, {
      idField: 'messageId',
    }).subscribe((messages) => {
      const messageMap = new Map<string, ChannelMessage>();
      messages.forEach((messageData) => {
        const message = new ChannelMessage(
          messageData['content'],
          messageData['userId'],
          messageData['messageId'],
          messageData['time'],
          messageData['attachmentUrls'] || []
        );
        message.reactions = (messageData['reactions'] || []).map(
          (reaction: any) => ({
            emoji: reaction.emoji,
            count: reaction.count,
            userIds: Array.isArray(reaction.userIds) ? reaction.userIds : [],
          })
        );
        const threadData = messageData['thread'] || {};
        message.thread = Object.fromEntries(
          Object.entries(threadData).map(
            ([threadId, threadMessageData]: [string, any]) => [
              threadId,
              new ThreadMessage(
                threadMessageData.content,
                threadMessageData.userId,
                threadId,
                threadMessageData.reactions || [],
                threadMessageData.time,
                threadMessageData.attachmentUrls || []
              ),
            ]
          )
        );
        messageMap.set(message.messageId, message);
      });
      const previousMessages = this.messagesDataMap.get(channelId) || new Map();
      if (!this.areMapsEqual(previousMessages, messageMap)) {
        this.messagesDataMap.set(channelId, messageMap);
        this.messagesDataMapSubject.next(new Map(this.messagesDataMap));
      }
    });
  }

  private areMapsEqual(
    map1: Map<string, ChannelMessage>,
    map2: Map<string, ChannelMessage>
  ): boolean {
    if (map1.size !== map2.size) return false;
    for (const [key, value1] of map1) {
      const value2 = map2.get(key);
      if (!value2) return false;
      if (
        value1.content !== value2.content ||
        value1.userId !== value2.userId ||
        value1.time !== value2.time
      )
        return false;
      if (!this.areReactionsEqual(value1.reactions, value2.reactions))
        return false;
      if (!this.areThreadsEqual(value1.thread, value2.thread)) return false;
    }
    return true;
  }

  /**
   * Checks if two arrays of reactions are equal.
   * @param reactions1 The first array of reactions.
   * @param reactions2 The second array of reactions.
   * @returns True if the arrays are equal, false otherwise.
   */
  private areReactionsEqual(
    reactions1: { emoji: string; count: number; userIds: string[] }[],
    reactions2: { emoji: string; count: number; userIds: string[] }[]
  ): boolean {
    if (reactions1.length !== reactions2.length) return false;
    for (let i = 0; i < reactions1.length; i++) {
      const r1 = reactions1[i];
      const r2 = reactions2[i];
      if (
        r1.emoji !== r2.emoji ||
        r1.count !== r2.count ||
        !this.areArraysEqual(r1.userIds, r2.userIds)
      )
        return false;
    }
    return true;
  }

  private areThreadsEqual(
    thread1: Record<string, ThreadMessage>,
    thread2: Record<string, ThreadMessage>
  ): boolean {
    const keys1 = Object.keys(thread1);
    const keys2 = Object.keys(thread2);
    if (keys1.length !== keys2.length) return false;
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      const t1 = thread1[key];
      const t2 = thread2[key];
      if (
        t1.content !== t2.content ||
        t1.userId !== t2.userId ||
        t1.time !== t2.time ||
        !this.areReactionsEqual(t1.reactions, t2.reactions)
      )
        return false;
    }
    return true;
  }

  /**
   * Checks if two arrays are equal.
   * @param arr1 The first array.
   * @param arr2 The second array.
   * @returns True if the arrays are equal, false otherwise.
   */
  private areArraysEqual(arr1: string[], arr2: string[]): boolean {
    return (
      arr1.length === arr2.length &&
      arr1.every((value, index) => value === arr2[index])
    );
  }

  /**
   * Retrieves the threads for a specific message in a channel.
   * @param channelId The ID of the channel.
   * @param messageId The ID of the message.
   * @returns An object mapping thread IDs to ThreadMessage objects.
   */
  getThreadsForMessage(
    channelId: string,
    messageId: string
  ): { [threadId: string]: ThreadMessage } | undefined {
    const messageMap = this.messagesDataMap.get(channelId);
    const message = messageMap?.get(messageId);
    return message?.thread;
  }

  /**
   * Retrieves updates for a specific message.
   * @param messageId The ID of the message.
   * @returns An observable of the message data.
   */
  getMessageUpdates(messageId: string): Observable<any> {
    const messageDocRef = doc(this.firestore, `messages/${messageId}`);
    return docData(messageDocRef, { idField: 'messageId' });
  }

  /**
   * Updates the content of a message in a private chat.
   * @param privateChatId The ID of the private chat.
   * @param messageId The ID of the message to update.
   * @param newContent The new content of the message.
   */
  async updateMessageContentPrivateChat(
    privateChatId: string,
    messageId: string,
    newContent: string
  ): Promise<void> {
    const userId = this.userService.userId;
    if (!userId || !privateChatId || !messageId) {
      return;
    }
    const userDocRef = doc(this.firestore, `users/${userId}`);
    try {
      this.updateMessageContentPrivateChatFirestore(
        privateChatId,
        messageId,
        newContent,
        userDocRef
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Updates the content of a message in a private chat in Firestore.
   *
   * @param privateChatId The ID of the private chat.
   * @param messageId The ID of the message to update.
   * @param newContent The new content of the message.
   * @param userDocRef The reference to the user document in Firestore.
   */
  async updateMessageContentPrivateChatFirestore(
    privateChatId: string,
    messageId: string,
    newContent: string,
    userDocRef: DocumentReference
  ): Promise<void> {
    const userDocSnapshot = await getDoc(userDocRef);
    if (userDocSnapshot.exists()) {
      const privateChatData = userDocSnapshot.data()?.['privateChat'];
      const messages = privateChatData?.[privateChatId]?.messages;
      if (messages && messages[messageId]) {
        messages[messageId].content = newContent;
        await updateDoc(userDocRef, {
          [`privateChat.${privateChatId}.messages.${messageId}.content`]:
            newContent,
        });
      }
    }
  }

  /**
   * Sets the ID of the message to be edited.
   */
  setEditMessageId(messageId: string | null) {
    this.editMessageId = messageId;
  }

  /**
   * Sets the actual message to be displayed.
   * @param message The message to be displayed.
   */
  setActualMessage(message: ChannelMessage): void {
    if (message !== this.actualMessageSubject.value) {
      this.actualMessageSubject.next(message);
    }
  }

  /**
   * Adds or changes a reaction to a message in a channel or thread.
   * @param {any} emoji - The emoji used as a reaction.
   * @param {string} path - The Firestore path to the message.
   * @returns {Promise<void>} A promise that resolves when the reaction is added or changed.
   */
  async addOrChangeReactionChannelOrThread(
    emoji: any,
    path: string
  ): Promise<void> {
    const messageRef = doc(this.firestore, path);
    const currentMessage = this.actualMessageSubject.value;
    this.initializeReactions(currentMessage);
    const currentUser = await this.getCurrentUser();
    if (!currentUser) return;
    const updatedReactions = this.updateReactions(
      currentMessage,
      emoji,
      currentUser
    );
    if (!updatedReactions) return;
    await this.updateMessageReactions(messageRef, updatedReactions);
    this.actualMessageSubject.next(currentMessage);
  }

  /**
   * Initializes the reactions array if it is not present in the message.
   * @param {any} currentMessage - The current message object.
   */
  private initializeReactions(currentMessage: any): void {
    if (!currentMessage.reactions) {
      currentMessage.reactions = [];
    }
  }

  /**
   * Retrieves the current user data from the user service.
   * @returns {Promise<UserData | null>} A promise that resolves with the current user data or null if not found.
   */
  private async getCurrentUser(): Promise<UserData | null> {
    return new Promise<UserData | null>((resolve) => {
      this.userDataSubscription = this.userService.userData$.subscribe({
        next: (currentUser: UserData) => {
          if (
            !currentUser.uid ||
            !currentUser.displayName ||
            !currentUser.photoURL
          )
            resolve(null);
          else resolve(currentUser);
        },
      });
    });
  }

  /**
   * Updates the reactions array of the message with the new or changed reaction.
   * @param {any} currentMessage - The current message object.
   * @param {any} emoji - The emoji used as a reaction.
   * @param {UserData} currentUser - The current user who is reacting.
   * @returns {any[] | null} The updated reactions array or null if the reaction wasn't updated.
   */
  private updateReactions(
    currentMessage: any,
    emoji: any,
    currentUser: UserData
  ): any[] | null {
    const existingReaction = currentMessage.reactions.find(
      (r: { emoji: { shortName: any } }) =>
        r.emoji.shortName === emoji.shortName
    );
    if (existingReaction) {
      if (existingReaction.userIds.includes(currentUser.uid)) return null;
      else {
        existingReaction.count += 1;
        existingReaction.userIds.push(currentUser.uid);
      }
    } else
      currentMessage.reactions.push({
        emoji: emoji,
        count: 1,
        userIds: [currentUser.uid],
      });
    return currentMessage.reactions;
  }

  /**
   * Updates the message reactions in Firestore.
   * @param {DocumentReference} messageRef - The Firestore reference to the message.
   * @param {any[]} reactions - The updated reactions array.
   * @returns {Promise<void>} A promise that resolves when the message reactions are updated.
   */
  private async updateMessageReactions(
    messageRef: any,
    reactions: any[]
  ): Promise<void> {
    await updateDoc(messageRef, { reactions: reactions });
  }

  /**
   * Deletes a message from the private chat of both users.
   * @param {string} privateChatId - The ID of the private chat.
   * @param {string} messageId - The ID of the message to be deleted.
   * @returns {Promise<void>} A promise that resolves when the message is deleted.
   */
  async deleteMessage(privateChatId: string, messageId: string): Promise<void> {
    try {
      const [user1Id, user2Id] = privateChatId.split('_');
      await Promise.all([
        this.deleteMessageFromUser(user1Id, privateChatId, messageId),
        this.deleteMessageFromUser(user2Id, privateChatId, messageId),
      ]);
    } catch (error) {
      console.error('Error deleting message for both users:', error);
      throw error;
    }
  }

  /**
   * Deletes the message from a specific user's private chat.
   * @param {string} userId - The ID of the user.
   * @param {string} privateChatId - The ID of the private chat.
   * @param {string} messageId - The ID of the message to be deleted.
   * @returns {Promise<void>} A promise that resolves when the message is deleted for the user.
   */
  private async deleteMessageFromUser(
    userId: string,
    privateChatId: string,
    messageId: string
  ): Promise<void> {
    const userDocRef = doc(this.firestore, `users/${userId}`);
    await updateDoc(userDocRef, {
      [`privateChat.${privateChatId}.messages.${messageId}`]: deleteField(),
    });
  }

  /**
   * Updates the content of a message in a thread or channel.
   * @param path The path to the message in the Firestore database.
   * @param newContent The new content of the message.
   */
  async updateMessageThreadOrChannel(
    path: string,
    newContent: string
  ): Promise<void> {
    const messageRef = doc(this.firestore, path);
    try {
      await updateDoc(messageRef, { content: newContent });
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Nachricht:', error);
      throw error;
    }
  }

  /**
   * Deletes a message in a thread or channel.
   * @param path The path to the message in the Firestore database.
   */
  async deleteMessageInThreadOrChannel(path: string): Promise<void> {
    try {
      const threadMessageRef = doc(this.firestore, path);
      await deleteDoc(threadMessageRef);
    } catch (error) {
      console.error('Fehler beim Löschen der Nachricht im Thread:', error);
      throw error;
    }
  }
}
