import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Channel } from '../../../shared/models/channel.model';
import { ChannelService } from '../../../shared/services/channel-service/channel.service';
import { UserService } from '../../../shared/services/user-service/user.service';
import { ChannelNewMemberComponent } from './channel-new-member/channel-new-member.component';
import { ChannelMembersListComponent } from './channel-members-list/channel-members-list.component';
import { ChannelDescriptionComponent } from './channel-description/channel-description.component';
import { NgFor } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-message-area-header',
  standalone: true,
  imports: [
    MatMenuModule,
    MatIcon,
    MatToolbarModule,
    MatMenuTrigger,
    MatToolbarModule,
    ChannelNewMemberComponent,
    ChannelMembersListComponent,
    ChannelDescriptionComponent,
    NgFor,
  ],
  templateUrl: './message-area-header.component.html',
  styleUrls: ['./message-area-header.component.scss'],
})
export class MessageAreaHeaderComponent implements OnInit {
  @ViewChild('chooseChannelMenuTrigger')
  chooseChannelMenuTrigger!: MatMenuTrigger;
  @ViewChild('memberListMenuTrigger') memberListMenuTrigger!: MatMenuTrigger;
  @ViewChild('addMemberMenuTrigger') addMemberMenuTrigger!: MatMenuTrigger;
  isMenuOpened: string = '';
  currentBorderRadius: string = '30px 30px 30px 30px';
  userService = inject(UserService);
  currentChannel: Channel | undefined;
  channelSubscription: Subscription | undefined;

  constructor(private channelService: ChannelService) {}

  /**
   * Initializes the component by subscribing to the current channel.
   */
  ngOnInit(): void {
    setTimeout(() => {
      this.channelSubscription = this.channelService.currentChannel$.subscribe({
        next: (channel) => {
          this.currentChannel = channel;
        },
      });
    }, 0);
  }

  ngOnDestroy(): void {
    if (this.channelSubscription) this.channelSubscription.unsubscribe();
  }

  /**
   * Closes the menu of the specified type.
   * @param menuType - The type of the menu to close.
   */
  closeMenu(menuType: 'choose-channel' | 'member-list' | 'add-member') {
    switch (menuType) {
      case 'choose-channel':
        this.chooseChannelMenuTrigger?.closeMenu();
        break;
      case 'member-list':
        this.memberListMenuTrigger?.closeMenu();
        break;
      case 'add-member':
        this.addMemberMenuTrigger?.closeMenu();
        break;
    }
  }

  /**
   * Opens the menu of the specified type.
   * @param menuType - The type of the menu to open.
   */
  openMenu(menuType: 'add-member') {
    if (menuType === 'add-member') this.addMemberMenuTrigger.openMenu();
  }

  /**
   * Toggles the border radius based on the menu type.
   * @param menuType - The type of the menu to toggle the border radius for.
   */
  toggleBorder(menuType: string): void {
    if (window.matchMedia('(min-width: 600px)').matches) {
      const borderRadiusMap: Record<string, string> = {
        'choose-channel': '0px 30px 30px 30px',
        'member-list': '30px 0px 30px 30px',
        'add-member': '30px 0px 30px 30px',
      };
      this.currentBorderRadius =
        borderRadiusMap[menuType] || '0px 30px 30px 30px';
      document.documentElement.style.setProperty(
        '--border-radius',
        this.currentBorderRadius
      );
    } else this.responsiveBorderRadius(menuType);
  }

  /**
   * Sets the border radius based on the menu type for responsive view.
   * @param menuType - The type of the menu.
   */
  responsiveBorderRadius(menuType: string) {
    const borderRadiusMap: Record<string, string> = {
      'choose-channel': '0px 0px 0px 0px',
      'member-list': '30px 0px 30px 30px',
      'add-member': '30px 0px 30px 30px',
    };
    this.currentBorderRadius = borderRadiusMap[menuType] || '0px 0px 30px 30px';
    document.documentElement.style.setProperty(
      '--border-radius',
      this.currentBorderRadius
    );
  }

  /**
   * Retrieves the photo URL for the given user ID.
   * @param userId - The ID of the user to retrieve the photo URL for.
   * @returns The photo URL as a string.
   */
  getPhotoURL(userId: string): string {
    return this.userService.getPhotoURL(userId);
  }
}
