import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { CreateGamePageComponent } from './create-game-page.component';
import { DeckService } from '../../api/services/deck.service';
import { MainService } from '../../api/services/main.service';
import { AlertService } from '../../shared/alert/alert.service';
import { SessionService } from '../../shared/session/session.service';

describe('CreateGamePageComponent', () => {
  let component: CreateGamePageComponent;
  let fixture: ComponentFixture<CreateGamePageComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MatCheckboxModule,
        TranslateModule.forRoot()
      ],
      declarations: [CreateGamePageComponent],
      providers: [
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({}) } }
        },
        { provide: DeckService, useValue: { getList: () => of({ decks: [] }) } },
        { provide: MainService, useValue: { createGame: () => of(null) } },
        { provide: AlertService, useValue: { toast: () => undefined } },
        {
          provide: SessionService,
          useValue: { session: { users: {}, clients: [], loggedUserId: 0 } }
        }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateGamePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
