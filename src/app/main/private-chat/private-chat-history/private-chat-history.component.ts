import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DateOfMessageComponent } from '../../main-message-area/chat-components/date-of-message/date-of-message.component';
import { NgFor, NgIf } from '@angular/common';
import { ChannelMessage } from '../../../shared/models/channel-message.model';
import { ActivatedRoute } from '@angular/router';
import { PrivateChat } from '../../../shared/models/private-chat.model';
import { Observable } from 'rxjs';
import { UserService } from '../../../shared/services/user-service/user.service';
import { OtherPrivateMessageTemplateComponent } from '../chat-components/other-private-message-template/other-private-message-template.component';
import { OwnPrivateMessageTemplateComponent } from '../chat-components/own-private-message-template/own-private-message-template.component';

@Component({
  selector: 'app-private-chat-history',
  standalone: true,
  imports: [DateOfMessageComponent, OtherPrivateMessageTemplateComponent, OwnPrivateMessageTemplateComponent, NgIf, NgFor],
  templateUrl: './private-chat-history.component.html',
  styleUrls: ['./private-chat-history.component.scss']
})
export class PrivateChatHistoryComponent implements OnInit {
  isEmojiContainerVisible: number = 0;
  currentPrivateChat$?: Observable<PrivateChat | undefined>;
  currentUserId: any;
  privateChatId: string = '';
  groupedMessages: any[] = []; // Array to store messages grouped by date
  currentPrivateChat: PrivateChat | undefined;

  @ViewChild('messageContainer') messageContainer!: ElementRef;
  public messages: ChannelMessage[] = [];
  private privateChat!: PrivateChat;

  constructor(
    private userService: UserService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.userService.userId;
    this.privateChatId = this.route.snapshot.paramMap.get('privateChatId') as string;

    this.userService.getUserDataByUID(this.currentUserId).subscribe({
      next: (userData) => {
        this.privateChat = userData.privateChat[this.privateChatId];
        this.messages = this.privateChat.messages;
        
        // Gruppiere und sortiere die Nachrichten
        this.groupMessagesByDateAndSender();
      },
      error: (err) => {
        console.error('Fehler beim Abrufen der Benutzerdaten:', err);
      }
    });
  }

  groupMessagesByDateAndSender(): void {
    const grouped = this.messages.reduce((acc: any, message: ChannelMessage) => {
      const messageDate = new Date(message.time).toLocaleDateString(); // Verwende 'time' anstelle von 'timestamp'
      const isOwnMessage = message.user.userId === this.currentUserId; // Prüfen, ob die Nachricht vom aktuellen Benutzer ist
  
      // Gruppiere nach Datum
      if (!acc[messageDate]) {
        acc[messageDate] = { date: messageDate, messages: [] };
      }
  
      // Füge Nachricht hinzu
      acc[messageDate].messages.push({ ...message, isOwnMessage });
      return acc;
    }, {});
  
    // Erstelle ein Array und sortiere es nach Datum
    this.groupedMessages = Object.values(grouped).map((group: any) => {
      group.messages.sort((a: ChannelMessage, b: ChannelMessage) => new Date(a.time).getTime() - new Date(b.time).getTime());
      return group;
    });
  }  
}
