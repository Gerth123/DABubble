import { Component, Input } from '@angular/core';
import { MainMessageAreaComponent } from '../../main-message-area.component';
import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { ChannelService } from '../../../../shared/services/channel-service/channel.service';
import { ThreadService } from '../../../../shared/services/thread-service/thread.service';
import { MatIcon } from '@angular/material/icon';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { EmojiComponent } from '@ctrl/ngx-emoji-mart/ngx-emoji';
import { MatMenuModule } from '@angular/material/menu';
import { Firestore } from '@angular/fire/firestore';
import { MessageService } from '../../../../shared/services/message-service/message.service';
import { MessageReactionsComponent } from '../../../../shared/components/message-reactions/message-reactions.component';
import { EmojiPickerComponent } from '../../../../shared/components/emoji-picker/emoji-picker.component';

@Component({
  selector: 'app-other-message-template',
  standalone: true,
  imports: [
    NgClass,
    DatePipe,
    NgIf,
    MatIcon,
    PickerModule,
    EmojiComponent,
    MatMenuModule,
    MessageReactionsComponent,
    EmojiPickerComponent
  ],
  templateUrl: './other-message-template.component.html',
  styleUrl: './other-message-template.component.scss',
})
export class OtherMessageTemplateComponent {
  isEmojiContainerVisible: number = 0;
  emojis: string = '';
  @Input() message: any = '';
  get threadKeys(): string[] {
    return Object.keys(this.message?.thread || {});
  }
  
  constructor(
    public mainMessageArea: MainMessageAreaComponent,
    public channelService: ChannelService,
    public threadService: ThreadService,
    private firestore: Firestore,
    private messageService: MessageService
  ) {}

  showEmojiContainer(id: number) {
    this.isEmojiContainerVisible = id;
  }

  hideEmojiContainer() {
    this.isEmojiContainerVisible = 0;
  }

  getLastReplyTime(thread: { [key: string]: any }): string {
    // Extrahiere die Nachrichten aus dem Objekt (Werte des Objekts)
    const messages = Object.values(thread);
  
    // Nimm die letzte Nachricht aus dem Array der Nachrichten
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
  

  addReaction(messageId: string, emoji: any): void {
    this.messageService.setActualMessage(this.message);
    this.messageService.addOrChangeReaction(messageId, emoji);
  }
}
