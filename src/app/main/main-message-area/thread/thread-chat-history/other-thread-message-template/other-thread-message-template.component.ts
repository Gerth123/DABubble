import { Component, inject, Input, OnInit } from '@angular/core';
import { UserService } from '../../../../../shared/services/user-service/user.service';
import { PrivateChatService } from '../../../../../shared/services/private-chat-service/private-chat.service';
import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { MessageReactionsComponent } from '../../../../../shared/components/message-reactions/message-reactions.component';
import { EmojiPickerComponent } from '../../../../../shared/components/emoji-picker/emoji-picker.component';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { EmojiComponent } from '@ctrl/ngx-emoji-mart/ngx-emoji';
import { AttachmentPreviewComponent } from '../../../../../shared/components/attachment-preview/attachment-preview.component';

@Component({
  selector: 'app-other-thread-message-template',
  standalone: true,
  imports: [NgClass, NgFor, AttachmentPreviewComponent, DatePipe, EmojiComponent, MatIcon, MatMenu, MatMenuTrigger, EmojiPickerComponent, MessageReactionsComponent, NgIf],
  templateUrl: './other-thread-message-template.component.html',
  styleUrl: './other-thread-message-template.component.scss'
})
export class OtherThreadMessageTemplateComponent implements OnInit {
  isEmojiContainerVisible: number = 0;
  @Input() message: any = '';
  displayName: string = '';
  photoURL: string = '';
  public userService = inject(UserService);
  public privateChatService = inject(PrivateChatService);

  constructor() {}

  ngOnInit() {
    if (this.message) {
     this.userService.getUserDataByUID(this.message.userId).subscribe((data) => {
       this.displayName = data.displayName;
       this.photoURL = data.photoURL;
     });
    }
  }

  showEmojiContainer(id: number) {
    this.isEmojiContainerVisible = id;
    // console.log(this.message.thread.messages.length);
  }

  hideEmojiContainer() {
    this.isEmojiContainerVisible = 0;
  }

  getLastReplyTime(messages: any[]): string {
    // Nimm die letzte Nachricht aus dem Array
    const lastMessage = messages[messages.length - 1];
  
    if (lastMessage && lastMessage.time) {
      // Formatiere die Zeit (Hier anpassen, falls nötig)
      const date = new Date(lastMessage.time);
      const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false, // Für 24-Stunden-Format, ändern auf true für 12-Stunden-Format
      };
      return date.toLocaleTimeString([], options) + ' Uhr';
    }
  
    return 'Keine Antworten'; // Falls keine Nachrichten vorhanden sind
  }

  addReaction(messageId: string, emoji: any) {
    // this.userService.addReaction(messageId, emoji);
  }
}