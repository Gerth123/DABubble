import { Component, ElementRef, ViewChild } from '@angular/core';
import { ThreadMessage } from '../../../../shared/models/thread-message.model';
import { Subscription } from 'rxjs';
import { PrivateChatMessage } from '../../../../shared/models/private-chat-message.model';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatMenu, MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { Firestore } from '@angular/fire/firestore';
import { StorageService } from '../../../../shared/services/storage-service/storage.service';
import { UserService } from '../../../../shared/services/user-service/user.service';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { PickerComponent, PickerModule } from '@ctrl/ngx-emoji-mart';
import { NgClass } from '@angular/common';
import { AttachmentPreviewComponent } from '../../../../shared/components/attachment-preview/attachment-preview.component';
import { MentionUserComponent } from '../../../../shared/components/mention-user/mention-user.component';
import { UploadMethodSelectorComponent } from '../../../../shared/components/upload-method-selector/upload-method-selector.component';
import {
  collection,
  doc,
  DocumentReference,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { ActivatedRoute } from '@angular/router';
import { ThreadPrivateChatService } from '../../../../shared/services/thread-private-chat/thread-private-chat.service';

@Component({
  selector: 'app-thread-private-chat-new-message',
  standalone: true,
  imports: [
    FormsModule,
    MatIcon,
    MatMenuModule,
    PickerModule,
    MatMenu,
    PickerComponent,
    NgClass,
    AttachmentPreviewComponent,
    MentionUserComponent,
    UploadMethodSelectorComponent,
    MatSidenavModule,
  ],
  templateUrl: './thread-private-new-message.component.html',
  styleUrl: './thread-private-new-message.component.scss',
})
export class ThreadPrivateChatNewMessageComponent {
  newMessageContent: string = '';
  attachmentUrls: string[] = [];
  message?: PrivateChatMessage | null;
  threadSubscription: Subscription | undefined;
  closeAttachmentSubscription: Subscription | undefined;
  closeUploadMethodSubscription: Subscription | undefined;
  @ViewChild('threadAttachmentSidenav') threadAttachmentSidenav!: MatSidenav;
  @ViewChild('threadAttachmentSidenav', { read: ElementRef })
  attachmentSidenavElement!: ElementRef;
  currentBorderRadius: string = '30px 30px 30px 30px';
  @ViewChild('mentionMenuThreadTrigger', {
    static: false,
    read: MatMenuTrigger,
  })
  mentionMenuTrigger!: MatMenuTrigger;
  mentionOpenedAtTextarea: boolean = false;
  @ViewChild('emojiMenuThreadTrigger', { static: false, read: MatMenuTrigger })
  emojiMenuThreadTrigger!: MatMenuTrigger;
  mentionTag: string = '@';
  paramsSubscription: Subscription | undefined;
  privateChatId: string | null = null;

  @ViewChild(MatMenuTrigger) uploadMethodMenuTrigger!: MatMenuTrigger;

  constructor(
    private threadService: ThreadPrivateChatService,
    private firestore: Firestore,
    private storageService: StorageService,
    private userService: UserService,
    private route: ActivatedRoute
  ) {}

  /**
   * Initialize the component and subscribe to actual message changes and attachment preview close events.
   */
  ngOnInit(): void {
    this.paramsSubscription = this.route.paramMap.subscribe((params) => {
      this.privateChatId = params.get('privateChatId');
    });

    this.threadSubscription = this.threadService.actualMessageSubject.subscribe(
      (message) => {
        this.message = message;
      }
    );
    this.closeAttachmentSubscription = this.storageService
      .onCloseAttachmentPreview()
      .subscribe(() => {
        this.closeAttachmentSidenav();
      });
    this.closeUploadMethodSubscription = this.storageService
      .onCloseUploadMethodSelector()
      .subscribe(() => {
        this.closeUploadMethodMenu();
      });
  }

  /**
   * Clean up subscriptions on component destroy.
   */
  ngOnDestroy(): void {
    this.threadSubscription?.unsubscribe();
    this.closeAttachmentSubscription?.unsubscribe();
    this.closeUploadMethodSubscription?.unsubscribe();
  }

  /**
   * Sends a new message to Firestore.
   */
  async sendMessage(): Promise<void> {
    if (this.isMessageValid()) {
      const currentMessage = this.threadService.actualMessageSubject.value;
      if (!currentMessage) return;

      try {
        const otherUserId =
          this.privateChatId!.split('_')[0] === this.userService.userId
            ? this.privateChatId!.split('_')[1]
            : this.privateChatId!.split('_')[0];
        const messageDocRefCurrentUser = await this.getMessageDocRef(
          currentMessage.messageId
        );
        const messageDocRefOtherUser = await this.getOtherUserMessageDocRef(
          currentMessage.messageId,
          otherUserId
        );
        const messageExistsCurrentUser = await this.messageExists(
          messageDocRefCurrentUser
        );
        const messageExistsOtherUser = await this.messageExists(
          messageDocRefOtherUser
        );

        if (!messageExistsCurrentUser || !messageExistsOtherUser) {
          console.error(
            'Message document does not exist for one of the users:',
            currentMessage.messageId
          );
          return;
        }
        const newThreadId = this.generateNewThreadId();
        const newMessage = this.createNewMessage(newThreadId);
        this.resetMessageState();
        await Promise.all([
          this.addMessageToThread(
            newThreadId,
            newMessage,
            this.userService.userId
          ),
          this.addMessageToThread(newThreadId, newMessage, otherUserId),
        ]);
      } catch (error) {
        console.error(
          'Error saving message to Firestore for both users:',
          error
        );
      }
    }
  }

  /**
   * Retrieves the document reference for a message from another user's perspective.
   * @param {string} messageId - The ID of the message.
   * @param {string} otherUserId - The ID of the other user.
   */
  getOtherUserMessageDocRef(messageId: string, otherUserId: string) {
    return doc(
      this.firestore,
      `users/${otherUserId}/privateChat/${this.privateChatId}/messages/${messageId}`
    );
  }

  /**
   * Checks if the message content is valid.
   * @return {boolean} True if the message content is valid, false otherwise.
   */
  isMessageValid(): boolean {
    return (
      this.newMessageContent.trim().length > 0 || this.attachmentUrls.length > 0
    );
  }

  /**
   * Retrieves the document reference for a message based on its ID.
   * @param {string} messageId - The ID of the message.
   * @return {Promise<DocumentReference>} The document reference for the message.
   */
  async getMessageDocRef(messageId: string) {
    return doc(
      this.firestore,
      `users/${this.userService.userId}/privateChat/${this.privateChatId}/messages/${messageId}`
    );
  }

  /**
   * Checks if a message exists based on its document reference.
   * @param {DocumentReference} messageDocRef - The document reference for the message.
   * @return {Promise<boolean>} True if the message exists, false otherwise.
   */
  async messageExists(messageDocRef: DocumentReference) {
    const snapshot = await getDoc(messageDocRef);
    return snapshot.exists();
  }

  /**
   * Generates a new thread ID.
   * @return {string} The generated thread ID.
   */
  generateNewThreadId(): string {
    const timestamp = Date.now();
    const randomId = Math.floor(Math.random() * 1000) + 1;
    return `thread_${timestamp}_${randomId}`;
  }

  /**
   * Creates a new message object.
   * @param {string} newThreadId - The ID of the new thread.
   * @return {ThreadMessage} The new message object.
   */
  createNewMessage(newThreadId: string): ThreadMessage {
    return new ThreadMessage(
      this.newMessageContent.trim() || ' ',
      this.userService.userId,
      newThreadId,
      [],
      new Date().toISOString(),
      this.attachmentUrls.length > 0 ? this.attachmentUrls : []
    );
  }

  /**
   * Resets the message state.
   */
  resetMessageState(): void {
    this.newMessageContent = '';
    this.attachmentUrls = [];
    this.threadAttachmentSidenav.close();
  }

  /**
   * Adds a message to the thread.
   * @param {string} newThreadId - The ID of the new thread.
   * @param {ThreadMessage} newMessage - The new message object.
   */
  async addMessageToThread(
    newThreadId: string,
    newMessage: ThreadMessage,
    userId: string
  ): Promise<void> {
    const threadCollectionRef = collection(
      this.firestore,
      `users/${userId}/privateChat/${this.privateChatId}/messages/${this.threadService.actualMessageSubject.value?.messageId}/thread`
    );
    const threadDocRef = doc(threadCollectionRef, newThreadId);
    await setDoc(threadDocRef, {
      content: newMessage.content,
      userId: newMessage.userId,
      time: newMessage.time,
      messageId: newThreadId,
      attachmentUrls: newMessage.attachmentUrls,
    });
  }

  /**
   * Updates the thread ID of a message in Firestore.
   * @param {DocumentReference} messageDocRef - The document reference for the message.
   * @param {string} newThreadId - The ID of the new thread.
   */
  async updateThreadId(
    messageDocRef: DocumentReference,
    newThreadId: string
  ): Promise<void> {
    await updateDoc(messageDocRef, { threadId: newThreadId });
  }

  /**
   * Add an emoji to the message content.
   * @param event - The event containing the selected emoji.
   */
  addEmoji(event: any) {
    const emoji = event.emoji.native || event.emoji;
    this.newMessageContent += emoji;
    this.emojiMenuThreadTrigger.closeMenu();
  }

  /**
   * Inserts a mention into the message content, slicing off the '@' character if present.
   * @param mention - The mention to insert.
   */
  insertMention(mention: string): void {
    if (!this.mentionOpenedAtTextarea) this.newMessageContent += mention;
    else if (this.mentionOpenedAtTextarea) {
      const mentionWithOutAt = mention.slice(1);
      this.newMessageContent += mentionWithOutAt;
      this.mentionOpenedAtTextarea = false;
    }
  }

  /**
   * Toggle the border radius of the textarea based on the menu type.
   * @param menuType - The type of menu (e.g., 'upload', 'emoji', 'mention').
   */
  toggleBorder(menuType: string): void {
    if (window.matchMedia('(min-width: 600px)').matches) {
      const borderRadiusMap: { [key: string]: string } = {
        upload: '30px 30px 30px 30px',
        emoji: '30px 30px 30px 30px',
        mention: '30px 30px 30px 30px',
        default: '30px 30px 30px 30px',
      };
      this.currentBorderRadius =
        borderRadiusMap[menuType] || borderRadiusMap['default'];
      document.documentElement.style.setProperty(
        '--border-radius',
        this.currentBorderRadius
      );
    } else this.responsiveBorderRadius(menuType);
  }

  /**
   * Set the border radius for responsive view.
   * @param menuType - The type of the menu.
   */
  responsiveBorderRadius(menuType: string) {
    const borderRadiusMap: { [key: string]: string } = {
      'choose-channel': '30px',
      'member-list': '30px',
      'add-member': '30px',
    };
    this.currentBorderRadius = borderRadiusMap[menuType] || '30px';
    document.documentElement.style.setProperty(
      '--border-radius',
      this.currentBorderRadius
    );
  }

  /**
   * Open the attachment sidenav.
   */
  openAttachmentSidenav() {
    this.attachmentSidenavElement.nativeElement.classList.remove('d-none');
    this.threadAttachmentSidenav.open();
  }

  /**
   * Close the attachment sidenav.
   */
  closeAttachmentSidenav() {
    this.threadAttachmentSidenav.close();
    setTimeout(
      () => this.attachmentSidenavElement.nativeElement.classList.add('d-none'),
      300
    );
  }

  /**
   * Close the upload method menu.
   */
  closeUploadMethodMenu() {
    this.uploadMethodMenuTrigger.closeMenu();
  }

  /**
   * Add a download link to the attachment URLs.
   * @param url - The download link to be added.
   */
  addDownloadLink(url: string) {
    this.attachmentUrls = [...this.attachmentUrls, url];
  }

  /**
   * Remove an attachment from the attachment URLs.
   * @param index - The index of the attachment to be removed.
   */
  removeAttachment(index: number) {
    this.attachmentUrls.splice(index, 1);
  }

  /**
   * Remove an attachment from the attachment URLs.
   * @param removedUrl - The URL of the attachment to be removed.
   */
  onAttachmentRemoved(removedUrl: string) {
    this.attachmentUrls = this.attachmentUrls.filter(
      (url) => url !== removedUrl
    );
  }

  /**
   * Check if the textarea contains a mention and what mention type. After that, open the mention menu.
   * @param event - The textarea event.
   */
  checkForMention(event: Event): void {
    const textareaValue = (event.target as HTMLTextAreaElement).value;
    const lastChar = textareaValue.slice(-1);
    if (lastChar === '@') {
      this.mentionTag = '@';
      this.toggleBorder('mention');
      this.openMentionMenu();
    } else if (lastChar === '#') {
      this.mentionTag = '#';
      this.toggleBorder('upload');
      this.openMentionMenu();
    } else {
      this.closeMentionMenu();
    }
  }

  /**
   * Open the mention menu.
   */
  openMentionMenu(): void {
    if (this.mentionMenuTrigger) {
      this.mentionMenuTrigger.openMenu();
      this.mentionOpenedAtTextarea = true;
    } else console.error('mentionMenuTrigger is not initialized');
  }

  /**
   * Close the mention menu.
   */
  closeMentionMenu(): void {
    if (this.mentionMenuTrigger) this.mentionMenuTrigger.closeMenu();
  }
}
