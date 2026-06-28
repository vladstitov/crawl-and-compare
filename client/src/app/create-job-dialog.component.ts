import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CreateTaskRequest } from './services/server-api.service';

@Component({
  selector: 'app-create-job-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>Create New Record</h2>
    <mat-dialog-content>
      <form class="dialog-form" [formGroup]="form">
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>URL</mat-label>
          <input matInput formControlName="url" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Workflow</mat-label>
          <input matInput formControlName="workflow" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Tags (one per line: tag:text)</mat-label>
          <textarea matInput rows="5" formControlName="tags"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancel()">Cancel</button>
      <button mat-flat-button color="primary" type="button" [disabled]="form.invalid" (click)="create()">
        Create
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-form {
        display: grid;
        gap: 0.75rem;
        min-width: min(520px, 100%);
        padding-top: 0.4rem;
      }

      mat-form-field {
        width: 100%;
      }
    `
  ]
})
export class CreateJobDialogComponent {
  readonly form;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly dialogRef: MatDialogRef<CreateJobDialogComponent>
  ) {
    this.form = this.formBuilder.nonNullable.group({
      name: ['', Validators.required],
      url: ['', Validators.required],
      workflow: ['', Validators.required],
      tags: ['']
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  create(): void {
    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    const payload: CreateTaskRequest = {
      name: value.name.trim(),
      url: value.url.trim(),
      workflow: value.workflow.trim(),
      hasTags: this.parseTags(value.tags)
    };

    this.dialogRef.close(payload);
  }

  private parseTags(raw: string): { tag: string; text: string }[] {
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const separatorIndex = line.indexOf(':');
        if (separatorIndex < 0) {
          return { tag: line, text: '' };
        }

        return {
          tag: line.slice(0, separatorIndex).trim(),
          text: line.slice(separatorIndex + 1).trim()
        };
      });
  }
}
