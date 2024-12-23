import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { ChannelMessage } from '../../../shared/models/channel-message.model';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Firestore, FirestoreDataConverter } from '@angular/fire/firestore';
import { DocumentData, DocumentSnapshot } from '@angular/fire/firestore';
import { collection, doc, setDoc } from 'firebase/firestore';
import { CollectionReference } from '@firebase/firestore';
import { DocumentReference, getDoc, updateDoc } from 'firebase/firestore';
import { UserService } from '../../../shared/services/user-service/user.service';
import { ActivatedRoute } from '@angular/router';
import { ChannelService } from '../../../shared/services/channel-service/channel.service';
import { Channel } from '../../../shared/models/channel.model';
import { ThreadMessage } from '../../../shared/models/thread-message.model';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';
import { MentionUserComponent } from '../../../shared/components/mention-user/mention-user.component';
import { UploadMethodSelectorComponent } from '../../../shared/components/upload-method-selector/upload-method-selector.component';
import { NgClass } from '@angular/common';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { AttachmentPreviewComponent } from '../../../shared/components/attachment-preview/attachment-preview.component';
import { StorageService } from '../../../shared/services/storage-service/storage.service';
import { Subscription } from 'rxjs';
import { ThreadPrivateChatService } from '../../../shared/services/thread-private-chat/thread-private-chat.service';

const channelMessageConverter: FirestoreDataConverter<ChannelMessage> = {
  toFirestore(message: ChannelMessage): DocumentData {
    return {
      content: message.content,
      messageId: message.messageId,
      reactions: message.reactions,
      time: message.time,
      userId: message.userId,
      attachmentUrls: message.attachmentUrls,
    };
  },
  fromFirestore(snapshot: DocumentSnapshot<DocumentData>): ChannelMessage {
    const data: any = snapshot.data() || {};
    return new ChannelMessage(data.content, data.messageId, data.userId);
  },
};

@Component({
  selector: 'app-message-area-new-message',
  standalone: true,
  imports: [
    FormsModule,
    MatMenuTrigger,
    MatMenu,
    MatIconModule,
    MatSidenavModule,
    PickerModule,
    NgClass,
    MentionUserComponent,
    UploadMethodSelectorComponent,
    AttachmentPreviewComponent,
  ],
  templateUrl: './message-area-new-message.component.html',
  styleUrls: ['./message-area-new-message.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MessageAreaNewMessageComponent implements OnInit, OnDestroy {
  newMessageContent = '';
  channelId?: string;
  privateChatId?: string;
  userId?: string;
  component: string = '';
  channel: Channel | undefined;
  currentBorderRadius: string = '30px 30px 30px 30px';
  attachmentUrls: string[] = [];
  userDataSubscription: Subscription = new Subscription();
  channelSubscription: Subscription = new Subscription();
  closeAttachmentSubscription: Subscription = new Subscription();
  closeUploadMethodSubscription: Subscription = new Subscription();
  displayNames: string[] = [];
  mentionOpenedAtTextarea: boolean = false;
  routeSubscription: Subscription = new Subscription();
  @ViewChild('attachmentSidenav') attachmentSidenav!: MatSidenav;
  @ViewChild('attachmentSidenav', { read: ElementRef })
  attachmentSidenavElement!: ElementRef;
  @ViewChild('uploadMethodMenuTrigger', { static: false, read: MatMenuTrigger })
  uploadMethodMenuTrigger!: MatMenuTrigger;
  @ViewChild('mentionMenuTrigger', { static: false, read: MatMenuTrigger })
  mentionMenuTrigger!: MatMenuTrigger;
  @ViewChild('emojiMenuTrigger', { static: false, read: MatMenuTrigger })
  emojiMenuTrigger!: MatMenuTrigger;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;
  mentionTag: string = '@';

  constructor(
    private firestore: Firestore,
    private userService: UserService,
    private route: ActivatedRoute,
    private channelService: ChannelService,
    private storageService: StorageService,
    private ThreadPrivateChatService: ThreadPrivateChatService
  ) {}

  /**
   * Gets the placeholder text based on the channelId and privateChatId.
   */
  get placeholderText(): string {
    if (this.channelId) {
      return `Nachricht an #${this.channel?.channelName ?? 'einen Channel'}`;
    } else if (this.privateChatId) {
      return `Nachricht an @${
        this.ThreadPrivateChatService.chatUserName ?? 'einen Nutzer'
      }`;
    }
    return 'Nachricht eingeben';
  }

  /**
   * Initialize the component and subscribe to route parameters oninit.
   */
  ngOnInit() {
    this.subscribeParams();
    this.subscribeUserData();
    this.subscribeCloseMenus();

    this.route.paramMap.subscribe(() => {
      this.setFocusOnInput();
    });
  }

  /**
   * Sets focus on the message input field after the component is initialized.
   */
  ngAfterViewInit(): void {
    this.setFocusOnInput();
  }

  /**
   * Sets focus on the message input field.
   */
  private setFocusOnInput(): void {
    if (this.messageInput?.nativeElement) {
      this.messageInput.nativeElement.focus();
    }
  }

  /**
   * Subscribes to route parameters and updates the component's properties.
   */
  subscribeParams() {
    this.routeSubscription = this.route.paramMap.subscribe(async (params) => {
      this.userId = this.userService.userId;
      this.privateChatId = params.get('privateChatId') || undefined;
      this.channelId = params.get('channelId') || undefined;
      if (this.channelId) {
        this.component = 'channel';
        this.channelSubscription = this.channelService
          .getChannelById(this.channelId)
          .subscribe((channel) => {
            if (channel) this.channel = channel;
          });
      } else if (this.privateChatId) {
        this.component = 'privateChat';
      }
    });
  }

  /**
   * Subscribes to the userDataMap$ observable and updates the displayNames array.
   */
  subscribeUserData() {
    this.userDataSubscription = this.userService.userDataMap$.subscribe(
      (userDataMap) => {
        this.displayNames = [];
        userDataMap.forEach((userData) => {
          this.displayNames.push(userData.displayName);
        });
      }
    );
  }

  /**
   * Subscribes to the onCloseAttachmentPreview and onCloseUploadMethodSelector observables.
   */
  subscribeCloseMenus() {
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
    if (this.userDataSubscription) this.userDataSubscription.unsubscribe();
    if (this.channelSubscription) this.channelSubscription.unsubscribe();
    if (this.routeSubscription) this.routeSubscription.unsubscribe();
    if (this.closeAttachmentSubscription)
      this.closeAttachmentSubscription.unsubscribe();
    if (this.closeUploadMethodSubscription)
      this.closeUploadMethodSubscription.unsubscribe();
  }

  /**
   * Generates a unique message ID for a private chat message.
   * @returns A string representing the message ID.
   */
  private static generatePrivateMessageId(): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.]/g, '')
      .slice(0, 14);
    const randomNumber = Math.floor(Math.random() * 1000) + 1;
    return `msg_${timestamp}_${randomNumber}`;
  }

  /**
   * Sends a new message to the channel or private chat.
   */
  async sendMessage() {
    if (!this.newMessageContent && this.attachmentUrls.length === 0) return;
    const messageContent = this.newMessageContent;
    this.newMessageContent = '';
    const messageId = this.privateChatId
      ? MessageAreaNewMessageComponent.generatePrivateMessageId()
      : `msg_${Date.now()}`;
    const newMessage = await this.generateMessage(messageContent, messageId);
    const attachmentsToSend = [...this.attachmentUrls];
    this.attachmentSidenav.close();
    this.attachmentUrls = [];
    this.checkForChannelOrPrivateChat(attachmentsToSend, newMessage, messageId);
  }

  /**
   * Generates a new message object.
   * @param {string} messageContent - The content of the message.
   * @param {string} messageId - The ID of the message.
   * @returns {ChannelMessage} - The generated message object.
   */
  async generateMessage(messageContent: string, messageId: string) {
    const newMessage = new ChannelMessage(
      messageContent,
      this.userId || '',
      messageId,
      new Date().toISOString(),
      this.attachmentUrls
    );
    return newMessage;
  }

  /**
   * Checks if the component is in a private chat or a channel and sends the message accordingly.
   * @param {string[]} attachmentsToSend - An array of attachment URLs to send.
   * @param {ChannelMessage} newMessage - The message object to be sent.
   * @param {string} messageId - The ID of the message.
   */
  async checkForChannelOrPrivateChat(
    attachmentsToSend: string[],
    newMessage: ChannelMessage,
    messageId: string
  ) {
    if (this.privateChatId) {
      await this.sendPrivateChatMessage(newMessage, attachmentsToSend);
    } else if (this.channelId) {
      this.channel?.addMessage(messageId, newMessage);
      await this.sendChannelMessage(newMessage, attachmentsToSend);
    } else console.error('Weder privateChatId noch channelId ist definiert.');
  }

  /**
   * Sends a message to a channel.
   * @param {ChannelMessage} newMessage - The message object to be sent.
   * @param {string[]} attachments - An array of attachment URLs.
   */
  private async sendChannelMessage(
    newMessage: ChannelMessage,
    attachments: string[]
  ) {
    newMessage.attachmentUrls = attachments;
    const messagesRef = collection(
      this.firestore,
      `channels/${this.channelId}/messages`
    );
    this.addMessageToChannel(messagesRef, newMessage);
  }

  /**
   * Adds a message to a channel.
   * @param {CollectionReference} messagesRef - The reference to the messages collection.
   * @param {ChannelMessage} newMessage - The message object to be added.
   */
  private async addMessageToChannel(
    messagesRef: CollectionReference,
    newMessage: ChannelMessage
  ) {
    try {
      const newMessageDocRef = doc(messagesRef, newMessage.messageId);
      await setDoc(
        newMessageDocRef,
        channelMessageConverter.toFirestore(newMessage)
      );
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht im Channel:', error);
    }
  }

  /**
   * Sends a private chat message.
   * @param {ThreadMessage} newMessage - The message object to be sent.
   * @param {string[]} attachments - An array of attachment URLs.
   */
  private async sendPrivateChatMessage(
    newMessage: ThreadMessage,
    attachments: string[]
  ) {
    const [userId1, userId2] = this.privateChatId!.split('_');
    const isSelfMessage = this.userId === userId1;
    const userDocRef = doc(this.firestore, `users/${this.userId}`);
    const userSnapshot = await getDoc(userDocRef);
    if (!userSnapshot.exists()) return;
    const newMessageId =
      MessageAreaNewMessageComponent.generatePrivateMessageId();
    const userMessagesCollectionRef = collection(
      this.firestore,
      `users/${this.userId}/privateChat/${this.privateChatId}/messages`
    );
    await this.addMessageToSubcollection(
      userMessagesCollectionRef,
      newMessageId,
      newMessage,
      attachments
    );
    const otherUserId = isSelfMessage ? userId2 : userId1;
    const otherUserMessagesCollectionRef = collection(
      this.firestore,
      `users/${otherUserId}/privateChat/${this.privateChatId}/messages`
    );
    await this.addMessageToSubcollection(
      otherUserMessagesCollectionRef,
      newMessageId,
      newMessage,
      attachments
    );
  }

  /**
   * Speichert die Nachricht in der 'messages' Subkollektion eines Benutzers.
   */
  async addMessageToSubcollection(
    messagesCollectionRef: CollectionReference<DocumentData>,
    newMessageId: string,
    newMessage: ThreadMessage,
    attachments: string[]
  ): Promise<void> {
    try {
      const newMessageDocRef = doc(messagesCollectionRef, newMessageId);
      await setDoc(newMessageDocRef, {
        content: newMessage.content,
        messageId: newMessageId,
        reactions: newMessage.reactions,
        time: newMessage.time,
        userId: this.userId,
        attachmentUrls: attachments,
      });
    } catch (error) {
      console.error('Error saving message to subcollection:', error);
    }
  }

  /**
   * Add an emoji to the message content.
   * @param event - The event containing the selected emoji.
   */
  addEmoji(event: any) {
    const emoji = event.emoji.native || event.emoji;
    this.newMessageContent += emoji;
    this.emojiMenuTrigger.closeMenu();
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
        mention: '30px 30px 30px 0px',
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
    this.attachmentSidenav.open();
  }

  /**
   * Close the attachment sidenav.
   */
  closeAttachmentSidenav() {
    if (this.attachmentUrls.length > 1) return;
    this.attachmentSidenav.close();
    setTimeout(
      () => this.attachmentSidenavElement.nativeElement.classList.add('d-none'),
      300
    );
  }

  /**
   * Close the upload method menu.
   */
  closeUploadMethodMenu() {
    if (this.uploadMethodMenuTrigger) this.uploadMethodMenuTrigger.closeMenu();
  }

  /**
   * Add an attachment URL to the attachment URLs array.
   * @param url - The URL of the attachment to be added.
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
   * Check if the textarea contains a mention and open the mention menu if it does.
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
