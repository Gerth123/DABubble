import { Component } from '@angular/core';
import { HeaderComponent } from './header/header.component';
import { MainMessageAreaComponent } from './main-message-area/main-message-area.component';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
@Component({
  selector: 'app-main',
  standalone: true,
  imports: [
    HeaderComponent,
    MainMessageAreaComponent,
    MatIconModule,
    MatSidenavModule,
    MatButtonModule,
    MatToolbarModule,
  ],
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss',
})
export class MainComponent {}
